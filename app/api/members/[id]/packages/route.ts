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
