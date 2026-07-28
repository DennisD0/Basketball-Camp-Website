import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { resolveMember } from '@/lib/name-match'

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
    const pool = (await prisma.member.findMany()).map(m => ({
      id: m.id, firstName: m.firstName, lastName: m.lastName,
    }))

    let created = 0
    let updated = 0
    const errors: string[] = []

    for (const row of rows) {
      if (!row.firstName) continue
      // strict: this sheet is the roster — never merge two of its own rows
      const existing = resolveMember(`${row.firstName} ${row.lastName ?? ''}`, pool, { strict: true })

      const data = {
        guardianName: row.guardianName || undefined,
        guardianPhone: row.guardianPhone || undefined,
        packageType: row.packageType || undefined,
        sessionsTotal: row.sessionsTotal ?? undefined,
        sessionsUsed: row.sessionsUsed ?? undefined,
        teamAssignment: row.teamAssignment || undefined,
      }

      try {
        // NOTE: Amount Paid is intentionally NOT written as a Payment here.
        // The Revenue CSV is the single source of truth for money; creating
        // payments from this sheet double-counted every package into finances.
        if (existing) {
          await prisma.member.update({ where: { id: existing.id }, data })
          updated++
        } else {
          const m = await prisma.member.create({
            data: {
              firstName: row.firstName,
              lastName: row.lastName ?? '',
              status: 'ACTIVE',
              ...data,
            },
          })
          pool.push({ id: m.id, firstName: m.firstName, lastName: m.lastName })
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
