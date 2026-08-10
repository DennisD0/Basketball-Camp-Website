import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { SPORTS, isSport } from '@/lib/sports'

export async function GET() {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const payments = await prisma.payment.findMany({
      include: { member: { select: { id: true, firstName: true, lastName: true, teamAssignment: true } } },
      orderBy: { date: 'desc' },
    })
    return NextResponse.json(payments)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { memberId, amount, method, date, notes, sport } = body

  if (!memberId || !amount || !method || !date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  // A student can play both sports, so this is never derived from the member at
  // write time — the form prefills a guess and staff confirm it.
  if (!isSport(sport)) {
    return NextResponse.json({ error: `sport must be one of: ${SPORTS.join(', ')}` }, { status: 400 })
  }

  try {
    const payment = await prisma.payment.create({
      data: {
        memberId,
        amount: parseFloat(amount),
        method,
        date: new Date(date),
        notes: notes || null,
        sport,
      },
      include: { member: { select: { id: true, firstName: true, lastName: true } } },
    })
    return NextResponse.json(payment, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
