import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

interface PackageRow {
  firstName: string
  lastName: string
  guardianName?: string
  guardianPhone?: string
  packageType?: string
  sessionsTotal?: number
  sessionsUsed?: number
  amountPaid?: number
  teamAssignment?: string
}

function normalize(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows }: { rows: PackageRow[] } = await req.json()
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  try {
    const members = await prisma.member.findMany()
    const byFull = new Map<string, typeof members[0]>()
    for (const m of members) {
      byFull.set(normalize(`${m.firstName} ${m.lastName}`), m)
    }

    let created = 0
    let updated = 0
    const errors: string[] = []

    for (const row of rows) {
      if (!row.firstName) continue
      const key = normalize(`${row.firstName} ${row.lastName ?? ''}`)
      const existing = byFull.get(key)

      const data = {
        guardianName: row.guardianName || undefined,
        guardianPhone: row.guardianPhone || undefined,
        packageType: row.packageType || undefined,
        sessionsTotal: row.sessionsTotal ?? undefined,
        sessionsUsed: row.sessionsUsed ?? undefined,
        teamAssignment: row.teamAssignment || undefined,
      }

      try {
        if (existing) {
          await prisma.member.update({ where: { id: existing.id }, data })
          // Create payment record if amount provided
          if (row.amountPaid && row.amountPaid > 0) {
            await prisma.payment.create({
              data: {
                memberId: existing.id,
                amount: row.amountPaid,
                method: 'CASH',
                date: new Date('2025-11-21'),
                notes: `Imported from packages sheet — ${row.packageType ?? ''}`,
              },
            })
          }
          updated++
        } else {
          const member = await prisma.member.create({
            data: {
              firstName: row.firstName,
              lastName: row.lastName ?? '',
              status: 'ACTIVE',
              ...data,
            },
          })
          if (row.amountPaid && row.amountPaid > 0) {
            await prisma.payment.create({
              data: {
                memberId: member.id,
                amount: row.amountPaid,
                method: 'CASH',
                date: new Date('2025-11-21'),
                notes: `Imported from packages sheet — ${row.packageType ?? ''}`,
              },
            })
          }
          created++
        }
      } catch (err) {
        errors.push(`${row.firstName} ${row.lastName}: ${String(err)}`)
      }
    }

    return NextResponse.json({ created, updated, errors })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
