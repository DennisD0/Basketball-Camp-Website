import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { BACKFILL_NOTE } from '@/lib/packages'

/**
 * What a reset would destroy that no CSV can bring back.
 *
 * `DELETE /api/import` wipes every member unconditionally, on the assumption
 * that re-uploading the six sheets restores them. That holds only for students
 * the sheets actually contain. A student added by hand, or created by approving
 * a registration, is in no CSV — resetting deletes them, their check-ins and
 * their payments permanently.
 *
 * How we tell the two apart: backfill stamps BACKFILL_NOTE on a package for
 * every member the Student & Packages sheet defines, and only for those. So any
 * member with no such package in their history has never come from a sheet.
 * History, not just the active package — a sheet student who has since been
 * renewed by a coach still carries their original backfilled package, closed.
 */
export async function GET() {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const atRisk = await prisma.member.findMany({
      where: { packages: { none: { notes: BACKFILL_NOTE } } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        _count: { select: { attendance: true, payments: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    })

    return NextResponse.json({
      members: atRisk.map(m => ({
        id: m.id,
        name: `${m.firstName} ${m.lastName}`.trim(),
        attendance: m._count.attendance,
        payments: m._count.payments,
      })),
      totals: {
        members:    atRisk.length,
        attendance: atRisk.reduce((s, m) => s + m._count.attendance, 0),
        payments:   atRisk.reduce((s, m) => s + m._count.payments, 0),
      },
    })
  } catch (err) {
    console.error('[import reset-preview]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
