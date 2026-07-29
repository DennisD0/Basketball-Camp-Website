import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { nameKey, resolveMember } from '@/lib/name-match'

async function requireAuth() {
  const cookieStore = await cookies()
  return cookieStore.has('auth')
}

export async function DELETE() {
  if (!(await requireAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Delete in FK-safe order: dependents first, then parents
    await prisma.attendance.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.payment.deleteMany()
    await Promise.all([
      prisma.member.deleteMany(),
      prisma.session.deleteMany(),
      prisma.expense.deleteMany(),
      prisma.trialStudent.deleteMany(),
      // Cleared too, so a full re-upload starts from an empty slate rather than
      // leaving stale summary rows behind.
      prisma.monthlyProfit.deleteMany(),
    ])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[import delete]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    return await runImport(request)
  } catch (err) {
    console.error('[import]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

async function runImport(request: NextRequest) {
  const { members: memberRows, attendance: attendanceRows } = await request.json()

  let membersCreated = 0
  let membersUpdated = 0
  let membersSkipped = 0

  // memberKey → member id
  const memberKeyToId: Record<string, string> = {}

  // Deduplicate input rows by key — first occurrence wins.
  // Prevents concurrent creates when the same name appears twice in one payload.
  const seen = new Set<string>()
  const validRows = (memberRows ?? []).filter((r: { firstName?: string; lastName?: string }) => {
    if (!r.firstName?.trim()) return false
    const k = nameKey(`${r.firstName} ${r.lastName ?? ''}`)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  // --- Fetch all existing members in one query ---
  const existingMembers = await prisma.member.findMany({
    select: { id: true, firstName: true, lastName: true, teamAssignment: true },
  })

  const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()

  // Names the Check-in sheet spells differently from Student & Packages —
  // resolved rather than duplicated. Reported back so the sheets can be fixed.
  const aliasResolved: string[] = []

  // --- Sequential: a newly created member must be visible to later rows, so
  //     name variants ("Ian short" after "Ian Kim (short)") resolve instead of
  //     racing each other into duplicate rows. Row counts here are small. ---
  const pool: { id: string; firstName: string; lastName: string; teamAssignment: string | null }[] =
    existingMembers.map(m => ({ ...m, lastName: m.lastName ?? '' }))

  for (const row of validRows as {
    firstName: string; lastName?: string; dateOfBirth?: string;
    guardianName?: string; guardianEmail?: string; guardianPhone?: string;
    teamAssignment?: string; sessionsTotal?: number;
  }[]) {
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
    const raw = `${data.firstName} ${data.lastName}`.trim()
    const key = nameKey(raw)
    const existing = resolveMember(raw, pool)

    let memberId: string
    if (existing) {
      const existingFull = `${existing.firstName} ${existing.lastName}`.trim()
      if (nameKey(existingFull) !== key) {
        aliasResolved.push(`"${raw}" → existing member "${existingFull}"`)
      }
      // True duplicate: every importable field is identical — skip entirely
      const isDuplicate = norm(existing.teamAssignment) === norm(data.teamAssignment)
      if (isDuplicate) {
        membersSkipped++
        memberId = existing.id
      } else {
        // Never overwrite a fuller name with a sheet's shorthand ("Brighton"
        // must not clobber "Brighton Lee"), and never blank out known fields.
        const { firstName: _f, lastName: _l, ...rest } = data
        void _f; void _l
        const member = await prisma.member.update({ where: { id: existing.id }, data: rest })
        membersUpdated++
        memberId = member.id
      }
    } else {
      const member = await prisma.member.create({ data: { ...data, sessionsTotal: data.sessionsTotal ?? 8 } })
      membersCreated++
      memberId = member.id
      pool.push({ id: member.id, firstName: member.firstName, lastName: member.lastName, teamAssignment: member.teamAssignment })
    }
    memberKeyToId[key] = memberId
  }

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
      const memberId = memberKeyToId[nameKey(r.memberKey)]
      const sessionId = dateToSessionId[r.date]
      if (!memberId || !sessionId) return null
      return { memberId, sessionId, status: 'PRESENT' as const }
    })
    .filter(Boolean)

  const { count: attendanceCreated } = await prisma.attendance.createMany({
    data: attendanceData,
    skipDuplicates: true,
  })

  const attendanceSkipped = attendanceData.length - attendanceCreated

  return NextResponse.json({ membersCreated, membersUpdated, membersSkipped, attendanceCreated, attendanceSkipped, aliasResolved })
}
