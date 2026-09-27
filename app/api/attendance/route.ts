import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { LEGACY_CLASS_KEY } from '@/lib/classes'

async function requireAuth() {
  const cookieStore = await cookies()
  return cookieStore.has('auth')
}

/** Day bounds for a `yyyy-mm-dd`, in the UTC midnight sessions are stored at. */
function dayRange(date: string) {
  const start = new Date(date + 'T00:00:00Z')
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end }
}

export async function GET(request: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const month = searchParams.get('month')
  const date = searchParams.get('date')

  try {
    if (month) {
      const [year, mon] = month.split('-').map(Number)
      const start = new Date(Date.UTC(year, mon - 1, 1))
      const end = new Date(Date.UTC(year, mon, 1))
      const sessions = await prisma.session.findMany({
        where: { date: { gte: start, lt: end } },
        select: { date: true, classKey: true },
      })

      // A day can now hold several sessions, so the calendar needs both the set
      // of days to light up and how many classes each holds.
      const classesByDate: Record<string, number> = {}
      for (const s of sessions) {
        const day = s.date.toISOString().slice(0, 10)
        classesByDate[day] = (classesByDate[day] ?? 0) + 1
      }
      return NextResponse.json({ dates: Object.keys(classesByDate), classesByDate })
    }

    if (date) {
      const { start, end } = dayRange(date)

      const sessions = await prisma.session.findMany({
        where: { date: { gte: start, lt: end } },
        select: {
          id: true,
          date: true,
          type: true,
          classKey: true,
          classLabel: true,
          attendance: { select: { memberId: true, status: true } },
        },
        orderBy: { classKey: 'asc' },
      })

      return NextResponse.json({ sessions })
    }

    return NextResponse.json({ error: 'Provide month or date param' }, { status: 400 })
  } catch (err) {
    console.error('[attendance/get]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const month = searchParams.get('month')
  const date = searchParams.get('date')

  try {
    let sessionIds: string[] = []

    if (month) {
      const [year, mon] = month.split('-').map(Number)
      const start = new Date(Date.UTC(year, mon - 1, 1))
      const end = new Date(Date.UTC(year, mon, 1))
      const sessions = await prisma.session.findMany({
        where: { date: { gte: start, lt: end } },
        select: { id: true },
      })
      sessionIds = sessions.map(s => s.id)
    } else if (date) {
      const { start, end } = dayRange(date)
      // `class` narrows the wipe to one class; without it the whole day goes,
      // which is what the import reset has always meant by a date.
      const only = searchParams.get('class')
      const sessions = await prisma.session.findMany({
        where: {
          date: { gte: start, lt: end },
          ...(only === null ? {} : { classKey: only }),
        },
        select: { id: true },
      })
      sessionIds = sessions.map(s => s.id)
    } else {
      return NextResponse.json({ error: 'Provide month or date param' }, { status: 400 })
    }

    if (sessionIds.length === 0) {
      return NextResponse.json({ sessionsDeleted: 0, attendanceDeleted: 0 })
    }

    const { count: attendanceDeleted } = await prisma.attendance.deleteMany({
      where: { sessionId: { in: sessionIds } },
    })
    await prisma.session.deleteMany({ where: { id: { in: sessionIds } } })

    return NextResponse.json({ sessionsDeleted: sessionIds.length, attendanceDeleted })
  } catch (err) {
    console.error('[attendance/delete]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const { date, presentIds, allMemberIds } = body ?? {}
  if (!date || !Array.isArray(presentIds) || !Array.isArray(allMemberIds)) {
    return NextResponse.json({ error: 'date, presentIds and allMemberIds required' }, { status: 400 })
  }
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be yyyy-mm-dd' }, { status: 400 })
  }

  // Which class is being recorded. Omitted means the whole day — the roster tab
  // that shows every student, and what a caller written before classes existed
  // sends. Both are legitimate; neither is inferred from the other.
  const classKey: string = typeof body?.classKey === 'string' ? body.classKey.trim() : LEGACY_CLASS_KEY
  if (classKey.length > 120) {
    return NextResponse.json({ error: 'classKey too long' }, { status: 400 })
  }
  const classLabel: string | null =
    typeof body?.classLabel === 'string' && body.classLabel.trim() ? body.classLabel.trim().slice(0, 200) : null

  // Don't create a session if nobody is being recorded at all
  if (allMemberIds.length === 0) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  try {
    const sessionDate = new Date(date + 'T00:00:00Z')

    const session = await prisma.session.upsert({
      where: { date_classKey: { date: sessionDate, classKey } },
      update: { classLabel },
      create: { type: 'PRACTICE', date: sessionDate, classKey, classLabel },
    })

    const presentSet = new Set(presentIds)

    await Promise.all(
      allMemberIds.map((memberId: string) =>
        prisma.attendance.upsert({
          where: { memberId_sessionId: { memberId, sessionId: session.id } },
          update: { status: presentSet.has(memberId) ? 'PRESENT' : 'ABSENT' },
          create: { memberId, sessionId: session.id, status: presentSet.has(memberId) ? 'PRESENT' : 'ABSENT' },
        })
      )
    )

    // A whole-day row from before the split still holds these students' marks
    // for this date. Leaving it would double-count them — `sessionsInWindow`
    // counts PRESENT rows, so one check-in recorded twice burns two sessions —
    // so the per-class record supersedes it, for these students only. Students
    // in the day's other classes keep theirs until their own class is saved.
    if (classKey !== LEGACY_CLASS_KEY) {
      const legacy = await prisma.session.findUnique({
        where: { date_classKey: { date: sessionDate, classKey: LEGACY_CLASS_KEY } },
        select: { id: true },
      })
      if (legacy) {
        await prisma.attendance.deleteMany({
          where: { sessionId: legacy.id, memberId: { in: allMemberIds as string[] } },
        })
        const left = await prisma.attendance.count({ where: { sessionId: legacy.id } })
        if (left === 0) await prisma.session.delete({ where: { id: legacy.id } })
      }
    }

    return NextResponse.json({ ok: true, sessionId: session.id, classKey })
  } catch (err) {
    console.error('[attendance/post]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
