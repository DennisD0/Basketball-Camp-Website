import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { openNewPackage, RESET_NOTE, utcToday } from '@/lib/packages'
import { summarizeSessions } from '@/lib/sessions'
import { resolveMember } from '@/lib/name-match'
import { resolveProgram, resolveSessionsTotal } from '@/lib/programs'
import { getRegistrationConfig } from '@/lib/get-registration-config'

/**
 * Put every student back on a clean package.
 *
 * The roster came out of the spreadsheets reading 7/7 across the board: the sheet's
 * "Sessions Used" column, and an approval route that credited 7 sessions to
 * everyone regardless of what they bought (see `resolveSessionsTotal`). Editing
 * 30 members by hand through the renewal modal is not a fix anyone will finish.
 *
 * So: close each member's current package and open a fresh one, with the total
 * their registration actually says they paid for. Attendance is never touched —
 * the new window simply starts today, so past check-ins stay on the record and
 * stop being charged, which is the same mechanism a coach-driven renewal uses.
 *
 * Split into preview and apply for the same reason `reset-preview` is: this
 * rewrites every member on the roster, so it has to say what it will do first.
 * GET writes nothing.
 */

type ResetRow = {
  memberId: string
  name: string
  team: string | null
  currentTotal: number
  currentUsed: number
  currentRemaining: number
  proposedTotal: number
  /** The package name from their registration, e.g. "5 Sessions". */
  proposedType: string | null
  /** Where proposedTotal came from, so a reviewer can tell a fact from a fallback. */
  source: 'registration' | 'current package'
}

async function buildPlan(): Promise<ResetRow[]> {
  const [members, registrations, { config }] = await Promise.all([
    prisma.member.findMany({
      where: { status: 'ACTIVE' },
      include: {
        packages: { where: { endDate: null } },
        attendance: {
          where: { status: 'PRESENT' },
          select: { session: { select: { date: true } } },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    }),
    prisma.registration.findMany({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
    }),
    getRegistrationConfig(),
  ])

  // Newest approved registration wins for a student who has registered twice —
  // it describes the package they are on now. An unresolvable or ambiguous name
  // maps to nobody, the same rule every other name lookup in the app follows.
  const candidates = members.map(m => ({ id: m.id, firstName: m.firstName, lastName: m.lastName }))
  const regByMember = new Map<string, (typeof registrations)[number]>()
  for (const reg of registrations) {
    const match = resolveMember(reg.childName, candidates)
    if (match && !regByMember.has(match.id)) regByMember.set(match.id, reg)
  }

  return members.map(m => {
    const active = m.packages[0] ?? null
    const current = summarizeSessions(m, active, m.attendance.map(a => a.session.date))

    const reg = regByMember.get(m.id)
    const fromRegistration = reg ? resolveSessionsTotal(reg, config.packages) : null

    return {
      memberId:         m.id,
      name:             `${m.firstName} ${m.lastName}`.trim(),
      team:             m.teamAssignment,
      currentTotal:     current.total,
      currentUsed:      current.used,
      currentRemaining: current.remaining,
      proposedTotal:    fromRegistration ?? current.total,
      proposedType:     reg ? resolveProgram(reg, config.packages).packageLabel : active?.packageType ?? null,
      source:           fromRegistration !== null ? 'registration' : 'current package',
    }
  })
}

export async function GET() {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rows = await buildPlan()
    return NextResponse.json({
      rows,
      totals: {
        members:      rows.length,
        fromSheet:    rows.filter(r => r.source === 'registration').length,
        usedCleared:  rows.reduce((s, r) => s + r.currentUsed, 0),
        totalChanged: rows.filter(r => r.proposedTotal !== r.currentTotal).length,
      },
    })
  } catch (err) {
    console.error('[members/reset-sessions/get]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)

  // Optional: reset only these members, and/or start the new packages on a past
  // date — a term that began two weeks ago should count the check-ins since.
  const only: Set<string> | null = Array.isArray(body?.memberIds) && body.memberIds.length
    ? new Set(body.memberIds as string[])
    : null

  let startDate = utcToday()
  if (typeof body?.startDate === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) {
      return NextResponse.json({ error: 'startDate must be yyyy-mm-dd' }, { status: 400 })
    }
    startDate = new Date(body.startDate + 'T00:00:00Z')
  }

  try {
    const plan = (await buildPlan()).filter(r => !only || only.has(r.memberId))

    let reset = 0
    for (const row of plan) {
      await openNewPackage(row.memberId, {
        sessionsTotal: row.proposedTotal,
        // The package they registered for, so the member card names it correctly
        // rather than carrying forward whatever the sheet happened to say.
        packageType: row.proposedType,
        startDate,
        notes: RESET_NOTE,
      })
      reset++
    }

    return NextResponse.json({ reset, startDate: startDate.toISOString().slice(0, 10) })
  } catch (err) {
    console.error('[members/reset-sessions/post]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
