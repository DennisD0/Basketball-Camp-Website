import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

async function requireAuth() {
  const cookieStore = await cookies()
  return cookieStore.has('auth')
}

export async function GET(request: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const month = searchParams.get('month')
  const date = searchParams.get('date')

  try {
    if (month) {
      const [year, mon] = month.split('-').map(Number)
      const start = new Date(year, mon - 1, 1)
      const end = new Date(year, mon, 1)
      const sessions = await prisma.session.findMany({
        where: { date: { gte: start, lt: end } },
        select: { date: true },
      })
      const dates = sessions.map(s => s.date.toISOString().slice(0, 10))
      return NextResponse.json({ dates })
    }

    if (date) {
      const day = new Date(date + 'T00:00:00Z')
      const nextDay = new Date(date + 'T00:00:00Z')
      nextDay.setUTCDate(nextDay.getUTCDate() + 1)

      const sessions = await prisma.session.findMany({
        where: { date: { gte: day, lt: nextDay } },
        select: { id: true, date: true, type: true },
      })

      return NextResponse.json({ sessions })
    }

    return NextResponse.json({ error: 'Provide month or date param' }, { status: 400 })
  } catch (err) {
    console.error('[attendance/get]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date, presentIds, allMemberIds } = await request.json()
  if (!date || !Array.isArray(presentIds) || !Array.isArray(allMemberIds)) {
    return NextResponse.json({ error: 'date, presentIds and allMemberIds required' }, { status: 400 })
  }

  // Don't create a session if nobody is being recorded at all
  if (allMemberIds.length === 0) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  try {
    const sessionDate = new Date(date + 'T00:00:00Z')

    const session = await prisma.session.upsert({
      where: { date: sessionDate },
      update: {},
      create: { type: 'PRACTICE', date: sessionDate },
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

    return NextResponse.json({ ok: true, sessionId: session.id })
  } catch (err) {
    console.error('[attendance/post]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
