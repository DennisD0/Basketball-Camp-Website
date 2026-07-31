import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

export async function POST() {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const counts = await prisma.attendance.groupBy({
      by: ['memberId'],
      where: { status: 'PRESENT' },
      _count: { memberId: true },
    })

    const memberIds = counts.map(c => c.memberId)
    const members = await prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, sessionsUsed: true },
    })
    const currentMap = Object.fromEntries(members.map(m => [m.id, m.sessionsUsed]))

    const updates = counts.filter(({ memberId, _count }) =>
      _count.memberId > (currentMap[memberId] ?? 0)
    )

    await Promise.all(
      updates.map(({ memberId, _count }) =>
        prisma.member.update({
          where: { id: memberId },
          data: { sessionsUsed: _count.memberId },
        })
      )
    )

    return NextResponse.json({ updated: updates.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
