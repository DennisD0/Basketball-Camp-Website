import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { openNewPackage } from '@/lib/packages'

/**
 * Package history for a member, newest first, plus the check-in dates those
 * packages are measured against — a package window means nothing without the
 * attendance it is counting.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [packages, attendance] = await Promise.all([
    prisma.memberPackage.findMany({
      where: { memberId: id },
      orderBy: { startDate: 'desc' },
    }),
    prisma.attendance.findMany({
      where: { memberId: id, status: 'PRESENT' },
      select: { session: { select: { date: true } } },
      orderBy: { session: { date: 'asc' } },
    }),
  ])

  return NextResponse.json({
    packages,
    attendanceDates: attendance.map(a => a.session.date.toISOString().slice(0, 10)),
  })
}

/** Renew: close the active package and start a fresh one. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  const sessionsTotal = Number(body?.sessionsTotal)

  if (!Number.isInteger(sessionsTotal) || sessionsTotal < 1 || sessionsTotal > 100) {
    return NextResponse.json({ error: 'sessionsTotal must be a whole number between 1 and 100' }, { status: 400 })
  }

  const member = await prisma.member.findUnique({ where: { id }, select: { id: true } })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  // Optional explicit start date, so a coach can backdate a package they forgot
  // to enter. Defaults to today.
  let startDate: Date | undefined
  if (typeof body?.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) {
    startDate = new Date(body.startDate + 'T00:00:00Z')
  }

  try {
    const pkg = await openNewPackage(id, {
      sessionsTotal,
      packageType: typeof body?.packageType === 'string' ? body.packageType : null,
      startDate,
      notes: typeof body?.notes === 'string' ? body.notes : null,
    })
    return NextResponse.json({ package: pkg })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/**
 * Move the active package's start date.
 *
 * A student's package does not always begin the day the paperwork does. Parents
 * pay late and owe a class from before they registered; a coach enters a student
 * a fortnight after their first session. The check-ins are real and they belong
 * to the package that was bought — they just fall outside the window as first
 * recorded, so they are charged to nothing.
 *
 * Opening a NEW package backdated would do it, but that is the wrong shape: it
 * leaves a student who has bought one package looking like they have bought two,
 * and the renewal it implies never happened. Correcting the date of the package
 * they are on says what actually occurred.
 *
 * Attendance is never touched. The window moves, and which check-ins fall inside
 * it follows from that — the same derivation every other page reads.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => null)

  if (typeof body?.startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) {
    return NextResponse.json({ error: 'startDate must be yyyy-mm-dd' }, { status: 400 })
  }
  const startDate = new Date(body.startDate + 'T00:00:00Z')
  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: 'startDate is not a real date' }, { status: 400 })
  }

  const packages = await prisma.memberPackage.findMany({
    where: { memberId: id },
    orderBy: { startDate: 'desc' },
  })
  const active = packages.find(p => p.endDate === null)
  if (!active) {
    return NextResponse.json(
      { error: 'This student has no active package to move. Start one first.' },
      { status: 404 },
    )
  }

  // The package this one replaced was closed ON the active package's start date.
  // Moving the start without moving that close date would leave a gap no package
  // covers, or an overlap where two do — and a check-in in either would be
  // counted wrongly. Keep the chain contiguous.
  const predecessor = packages.find(
    p => p.id !== active.id && p.endDate !== null && p.endDate.getTime() === active.startDate.getTime(),
  )
  if (predecessor && startDate.getTime() <= predecessor.startDate.getTime()) {
    return NextResponse.json(
      { error: 'That is on or before the previous package started. Pick a later date.' },
      { status: 400 },
    )
  }

  try {
    await prisma.$transaction(async tx => {
      await tx.memberPackage.update({ where: { id: active.id }, data: { startDate } })
      if (predecessor) {
        await tx.memberPackage.update({ where: { id: predecessor.id }, data: { endDate: startDate } })
      }
    })
    return NextResponse.json({ ok: true, startDate: body.startDate })
  } catch (err) {
    console.error('[members/packages/patch]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
