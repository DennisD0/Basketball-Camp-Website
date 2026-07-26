import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

interface ProfitRow {
  period: string
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  billyShare?: number
  benShare?: number
  notes?: string
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows }: { rows: ProfitRow[] } = await req.json()
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  try {
    let created = 0
    let updated = 0
    for (const r of rows) {
      const existing = await prisma.monthlyProfit.findUnique({ where: { period: r.period } })
      if (existing) {
        await prisma.monthlyProfit.update({
          where: { period: r.period },
          data: {
            totalRevenue: r.totalRevenue,
            totalExpenses: r.totalExpenses,
            netProfit: r.netProfit,
            billyShare: r.billyShare ?? null,
            benShare: r.benShare ?? null,
            notes: r.notes ?? null,
          },
        })
        updated++
      } else {
        await prisma.monthlyProfit.create({
          data: {
            period: r.period,
            totalRevenue: r.totalRevenue,
            totalExpenses: r.totalExpenses,
            netProfit: r.netProfit,
            billyShare: r.billyShare ?? null,
            benShare: r.benShare ?? null,
            notes: r.notes ?? null,
          },
        })
        created++
      }
    }
    return NextResponse.json({ created, updated })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
