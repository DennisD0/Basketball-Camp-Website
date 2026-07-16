import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

async function requireAuth() {
  const cookieStore = await cookies()
  return cookieStore.has('auth')
}

export async function POST(request: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { members: memberRows, attendance: attendanceRows } = await request.json()

  let membersCreated = 0
  let membersUpdated = 0

  // memberKey → member id
  const memberKeyToId: Record<string, string> = {}

  const validRows = (memberRows ?? []).filter((r: { firstName?: string }) => r.firstName?.trim())

  // --- Fetch all existing members in one query ---
  const existingMembers = await prisma.member.findMany({
    select: { id: true, firstName: true, lastName: true },
  })
  const existingByKey: Record<string, { id: string }> = {}
  for (const m of existingMembers) {
    existingByKey[`${m.firstName} ${m.lastName}`.trim().toLowerCase()] = { id: m.id }
  }

  // --- Batch: update existing + create new in parallel ---
  await Promise.all(validRows.map(async (row: {
    firstName: string; lastName?: string; dateOfBirth?: string;
    guardianName?: string; guardianEmail?: string; guardianPhone?: string;
    teamAssignment?: string; sessionsTotal?: number;
  }) => {
    const { firstName, lastName, dateOfBirth, guardianName, guardianEmail, guardianPhone, teamAssignment, sessionsTotal } = row
    const data = {
      firstName: firstName.trim(),
      lastName: (lastName ?? '').trim(),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      guardianName: guardianName?.trim() || undefined,
      guardianEmail: guardianEmail?.trim() || undefined,
      guardianPhone: guardianPhone?.trim() || undefined,
      teamAssignment: teamAssignment?.trim() || undefined,
      sessionsTotal: sessionsTotal ? Number(sessionsTotal) : undefined,
    }
    const key = `${data.firstName} ${data.lastName}`.trim().toLowerCase()
    const existing = existingByKey[key]

    let member
    if (existing) {
      member = await prisma.member.update({ where: { id: existing.id }, data })
      membersUpdated++
    } else {
      member = await prisma.member.create({ data: { ...data, sessionsTotal: data.sessionsTotal ?? 8 } })
      membersCreated++
    }
    memberKeyToId[key] = member.id
  }))

  // --- Sessions: batch upsert all unique dates in one transaction ---
  const uniqueDates = [...new Set((attendanceRows ?? []).map((r: { date: string }) => r.date))]
  const sessionDates = uniqueDates.map(d => new Date((d as string) + 'T00:00:00Z'))

  const sessions = await prisma.$transaction(
    sessionDates.map(date =>
      prisma.session.upsert({
        where: { date },
        update: {},
        create: { type: 'PRACTICE', date },
      })
    )
  )

  const dateToSessionId: Record<string, string> = {}
  uniqueDates.forEach((d, i) => { dateToSessionId[d as string] = sessions[i].id })

  // --- Attendance: one createMany with skipDuplicates ---
  const attendanceData = (attendanceRows ?? [])
    .map((r: { memberKey: string; date: string }) => {
      const memberId = memberKeyToId[r.memberKey.trim().toLowerCase()]
      const sessionId = dateToSessionId[r.date]
      if (!memberId || !sessionId) return null
      return { memberId, sessionId, status: 'PRESENT' as const }
    })
    .filter(Boolean)

  const { count: attendanceCreated } = await prisma.attendance.createMany({
    data: attendanceData,
    skipDuplicates: true,
  })

  return NextResponse.json({ membersCreated, membersUpdated, attendanceCreated })
}
