import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { guessSport } from '@/lib/sports'

/**
 * Assigning a sport to the payments that predate the column.
 *
 * The only signal on a historical payment is the member's `teamAssignment` —
 * free text from the Student & Packages sheet, e.g. "U12 Volleyball". That is
 * a guess, not a record: a student can be enrolled in both sports, so a
 * basketball player's class label says nothing certain about a payment that
 * might have been for volleyball.
 *
 * So this is split in two deliberately. GET proposes and writes nothing. POST
 * applies, and only ever the unambiguous proposals GET already showed. The
 * same shape as `reset-preview` — say what would happen before it happens.
 *
 * Written for a one-time backfill against the live database, which is why the
 * preview is the default and the apply has to be asked for.
 */

type Row = {
  paymentId: string
  memberName: string
  teamAssignment: string | null
  /** Shown so a reviewer can see what the guess was actually read from. */
  notes: string | null
  amount: number
  date: string
}

async function loadUntagged() {
  const payments = await prisma.payment.findMany({
    where: { sport: null },
    include: { member: { select: { firstName: true, lastName: true, teamAssignment: true } } },
    orderBy: { date: 'desc' },
  })

  const proposed: (Row & { sport: string })[] = []
  const ambiguous: Row[] = []

  for (const p of payments) {
    const row: Row = {
      paymentId: p.id,
      memberName: `${p.member.firstName} ${p.member.lastName}`.trim(),
      teamAssignment: p.member.teamAssignment,
      notes: p.notes,
      amount: Number(p.amount),
      date: p.date.toISOString().slice(0, 10),
    }
    // The Revenue importer writes "Package: volleyball_7_sessions" into notes,
    // which describes this payment. The class label only describes the member,
    // who may play both. Narrowest source first.
    const guess = guessSport(p.notes, p.member.teamAssignment)
    // guessSportFromTeam returns null when the label names both sports or
    // neither. Those are listed, never guessed at — the same rule name-match
    // follows for a name that could be two members.
    if (guess) proposed.push({ ...row, sport: guess })
    else ambiguous.push(row)
  }

  return { proposed, ambiguous }
}

export async function GET() {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [{ proposed, ambiguous }, alreadyTagged] = await Promise.all([
      loadUntagged(),
      prisma.payment.count({ where: { NOT: { sport: null } } }),
    ])

    return NextResponse.json({
      alreadyTagged,
      proposedCount: proposed.length,
      ambiguousCount: ambiguous.length,
      proposedTotal: proposed.reduce((s, r) => s + r.amount, 0),
      ambiguousTotal: ambiguous.reduce((s, r) => s + r.amount, 0),
      proposed,
      ambiguous,
      note: 'Nothing has been written. POST to this endpoint to apply the proposed rows only.',
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST() {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { proposed, ambiguous } = await loadUntagged()

    // Re-derived here rather than trusting ids from the client, so what gets
    // written is exactly what a GET right now would have shown. `sport: null`
    // stays in every where-clause: a payment somebody has already tagged by
    // hand must never be overwritten by a guess.
    const updated = await prisma.$transaction(
      proposed.map(r =>
        prisma.payment.updateMany({
          where: { id: r.paymentId, sport: null },
          data: { sport: r.sport },
        }),
      ),
    )

    return NextResponse.json({
      applied: updated.reduce((s, u) => s + u.count, 0),
      skippedAmbiguous: ambiguous.length,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
