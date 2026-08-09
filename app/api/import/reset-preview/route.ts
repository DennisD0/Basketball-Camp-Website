import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { BACKFILL_NOTE } from '@/lib/packages'

/**
 * What a reset would destroy that no CSV can bring back.
 *
 * `DELETE /api/import` wipes members AND expenses unconditionally, on the
 * assumption that re-uploading the six sheets restores them. That holds only
 * for rows the sheets actually contain.
 *
 * Members: a student added by hand, or created by approving a registration, is
 * in no CSV — resetting deletes them, their check-ins and their payments
 * permanently. How we tell the two apart: backfill stamps BACKFILL_NOTE on a
 * package for every member the Student & Packages sheet defines, and only for
 * those. So any member with no such package in their history has never come
 * from a sheet. History, not just the active package — a sheet student who has
 * since been renewed by a coach still carries their original backfilled
 * package, closed.
 *
 * Expenses: the discriminator is `importKey`, which `POST /api/expenses/import`
 * sets on every row it creates and which hand-entry through the Finances page
 * leaves null. So `importKey: null` is exactly "typed by a human, in no sheet".
 */
export async function GET() {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [atRisk, atRiskExpenses] = await Promise.all([
      prisma.member.findMany({
        where: { packages: { none: { notes: BACKFILL_NOTE } } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          _count: { select: { attendance: true, payments: true } },
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      }),
      prisma.expense.findMany({
        where: { importKey: null },
        select: { id: true, description: true, amount: true, date: true },
        orderBy: { date: 'desc' },
      }),
    ])

    const expenses = atRiskExpenses.map(e => ({
      id: e.id,
      description: e.description,
      amount: Number(e.amount),
      date: e.date.toISOString(),
    }))

    return NextResponse.json({
      members: atRisk.map(m => ({
        id: m.id,
        name: `${m.firstName} ${m.lastName}`.trim(),
        attendance: m._count.attendance,
        payments: m._count.payments,
      })),
      expenses,
      totals: {
        members:    atRisk.length,
        attendance: atRisk.reduce((s, m) => s + m._count.attendance, 0),
        payments:   atRisk.reduce((s, m) => s + m._count.payments, 0),
        expenses:       expenses.length,
        expenseAmount:  expenses.reduce((s, e) => s + e.amount, 0),
      },
    })
  } catch (err) {
    console.error('[import reset-preview]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
