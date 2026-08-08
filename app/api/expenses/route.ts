import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

async function requireAuth() {
  const cookieStore = await cookies()
  return cookieStore.has('auth')
}

export async function GET() {
  if (!(await requireAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' } })
    return NextResponse.json(expenses)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { description, category, amount, date } = await req.json()
  if (!description?.trim() || !category?.trim() || !amount || !date) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 })
  }
  try {
    const expense = await prisma.expense.create({
      data: {
        description: description.trim(),
        category: category.trim(),
        amount: parseFloat(amount),
        date: new Date(date + 'T00:00:00Z'),
      },
    })
    return NextResponse.json(expense, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, description, category, amount, date } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (!description?.trim() || !category?.trim() || !amount || !date) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 })
  }
  const parsedAmount = parseFloat(amount)
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
  }
  try {
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        description: description.trim(),
        category: category.trim(),
        amount: parsedAmount,
        // Same UTC-midnight normalisation as create, so an edited row sorts and
        // renders identically to one that was never touched.
        date: new Date(date + 'T00:00:00Z'),
      },
    })
    return NextResponse.json(expense)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    await prisma.expense.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
