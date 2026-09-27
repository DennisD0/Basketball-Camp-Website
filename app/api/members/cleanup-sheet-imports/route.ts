import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { isSheetClassLabel } from '@/lib/schedule'
import { resolveMember } from '@/lib/name-match'
import { summarizeSessions } from '@/lib/sessions'

/**
 * Clear out the roster the spreadsheets left behind.
 *
 * Students who arrived through the Student & Packages sheet AND later through
 * the registration form are on the members list twice. The sheet copy is the
 * stale one — it is labelled by when the class ran ("Friday 4pm") rather than
 * by age and sport, it stops being updated the moment the form takes over, and
 * there are enough of them that the team filter is unusable.
 *
 * Deleting a member is not reversible, and some of these rows are the only
 * record of money that was actually taken. So:
 *
 *  - GET writes nothing and says exactly what each row would cost, same split
 *    as `reset-sessions` and the import reset.
 *  - Payments and check-ins are MOVED to the surviving profile when there is
 *    one, never destroyed to tidy up a list. Finance totals are unchanged by a
 *    cleanup, which is the only way this is safe to run on a live roster.
 *  - A row with money on it and nowhere to move it to is reported as unsafe.
 *    The caller still decides; it just cannot decide by accident.
 */

type CleanupRow = {
  memberId: string
  name: string
  team: string | null
  status: string
  /** The profile their records move to, or null when nothing matches the name. */
  keeper: { id: string; name: string; team: string | null } | null
  payments: { count: number; total: number }
  checkIns: number
  sessionsRemaining: number
  /**
   * Nothing is lost by deleting this row: either a surviving profile inherits
   * its records, or there are none to inherit.
   */
  safe: boolean
}

async function buildPlan(): Promise<CleanupRow[]> {
  const members = await prisma.member.findMany({
    include: {
      packages: { where: { endDate: null } },
      payments: { select: { amount: true } },
      attendance: { select: { status: true, session: { select: { date: true } } } },
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  })

  const stale = members.filter(m => isSheetClassLabel(m.teamAssignment))
  // Only a profile that is NOT itself up for deletion can inherit records —
  // otherwise two sheet rows for the same student would hand their payments to
  // each other and both still go.
  const keepers = members
    .filter(m => !isSheetClassLabel(m.teamAssignment))
    .map(m => ({ id: m.id, firstName: m.firstName, lastName: m.lastName, teamAssignment: m.teamAssignment }))

  return stale.map(m => {
    const name = `${m.firstName} ${m.lastName}`.trim()
    // Same resolver the imports use, so the spellings it already reconciles
    // ("Bryan Zhai" → "Brian Zhai") are reconciled here too. An ambiguous name
    // resolves to nobody, which surfaces as a row with no keeper rather than a
    // guess about whose payments these are.
    const match = resolveMember(name, keepers)
    const paid = m.payments.reduce((sum, p) => sum + Number(p.amount), 0)
    const present = m.attendance.filter(a => a.status === 'PRESENT')
    const summary = summarizeSessions(m, m.packages[0] ?? null, present.map(a => a.session.date))

    return {
      memberId: m.id,
      name,
      team: m.teamAssignment,
      status: m.status,
      keeper: match ? { id: match.id, name: `${match.firstName} ${match.lastName}`.trim(), team: match.teamAssignment } : null,
      payments: { count: m.payments.length, total: paid },
      checkIns: present.length,
      sessionsRemaining: summary.remaining,
      safe: match !== null || (m.payments.length === 0 && present.length === 0),
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
        members:   rows.length,
        withKeeper: rows.filter(r => r.keeper).length,
        unsafe:    rows.filter(r => !r.safe).length,
        payments:  rows.reduce((s, r) => s + r.payments.count, 0),
        checkIns:  rows.reduce((s, r) => s + r.checkIns, 0),
      },
    })
  } catch (err) {
    console.error('[members/cleanup-sheet-imports/get]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)

  // An explicit list, always. There is no "delete everything the preview found"
  // shorthand: a modal with every box unticked must not fall through to wiping
  // the roster, the same rule `reset-sessions` follows.
  if (!Array.isArray(body?.memberIds) || body.memberIds.length === 0 || !body.memberIds.every((id: unknown) => typeof id === 'string')) {
    return NextResponse.json({ error: 'memberIds must be a non-empty list of member ids' }, { status: 400 })
  }
  const requested = new Set(body.memberIds as string[])

  try {
    // Re-derive rather than trusting ids from the client: a member whose label
    // is not a sheet label is not this endpoint's to delete, whoever asked.
    const plan = (await buildPlan()).filter(r => requested.has(r.memberId))

    let deleted = 0
    let paymentsMoved = 0
    let checkInsMoved = 0
    let paymentsDeleted = 0

    for (const row of plan) {
      if (row.keeper) {
        const keeperId = row.keeper.id

        const { count: moved } = await prisma.payment.updateMany({
          where: { memberId: row.memberId },
          data: { memberId: keeperId },
        })
        paymentsMoved += moved

        // Attendance is unique on (member, session), so a session both profiles
        // were marked at cannot take a second row. The keeper's own mark wins —
        // it is the profile that stays — and the duplicate is dropped.
        const keeperSessions = new Set(
          (await prisma.attendance.findMany({ where: { memberId: keeperId }, select: { sessionId: true } }))
            .map(a => a.sessionId),
        )
        const own = await prisma.attendance.findMany({
          where: { memberId: row.memberId },
          select: { id: true, sessionId: true },
        })
        const movable = own.filter(a => !keeperSessions.has(a.sessionId)).map(a => a.id)
        if (movable.length) {
          const { count } = await prisma.attendance.updateMany({
            where: { id: { in: movable } },
            data: { memberId: keeperId },
          })
          checkInsMoved += count
        }
      } else {
        paymentsDeleted += row.payments.count
      }

      // Whatever did not move goes with the profile. Packages cascade on the
      // member row; these three do not.
      await prisma.attendance.deleteMany({ where: { memberId: row.memberId } })
      await prisma.notification.deleteMany({ where: { memberId: row.memberId } })
      await prisma.payment.deleteMany({ where: { memberId: row.memberId } })
      await prisma.member.delete({ where: { id: row.memberId } })
      deleted++
    }

    return NextResponse.json({ deleted, paymentsMoved, checkInsMoved, paymentsDeleted })
  } catch (err) {
    console.error('[members/cleanup-sheet-imports/post]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
