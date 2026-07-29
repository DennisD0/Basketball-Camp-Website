import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { withImportKeys } from '@/lib/import-key'

interface ExpenseRow {
  description: string
  category: string
  amount: number
  date: string
  paidBy?: string
  notes?: string
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { expenses }: { expenses: ExpenseRow[] } = await req.json()
  if (!Array.isArray(expenses) || expenses.length === 0) {
    return NextResponse.json({ error: 'No expenses provided' }, { status: 400 })
  }

  try {
    // skipDuplicates + the unique importKey makes re-uploading the same sheet a no-op.
    const keyed = withImportKeys('exp', expenses, e => [e.description, e.category, e.amount, e.date, e.paidBy])
    const created = await prisma.expense.createMany({
      data: keyed.map(e => ({
        description: e.notes ? `${e.description} — ${e.notes}` : e.description,
        category: e.category,
        amount: e.amount,
        date: new Date(e.date),
        paidBy: e.paidBy || null,
        importKey: e.importKey,
      })),
      skipDuplicates: true,
    })
    return NextResponse.json({ created: created.count, skipped: keyed.length - created.count })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
