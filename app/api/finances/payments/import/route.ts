import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { resolveMember } from '@/lib/name-match'
import { withImportKeys } from '@/lib/import-key'

interface RevenueRow {
  studentName: string
  packageType: string
  paymentMethod: string
  amount: number
  date: string
  notes?: string
}

function mapMethod(raw: string): 'CASH' | 'BANK_TRANSFER' {
  return /cash/i.test(raw) ? 'CASH' : 'BANK_TRANSFER'
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows }: { rows: RevenueRow[] } = await req.json()
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  try {
    // Shared resolver — see lib/name-match.ts. Members created here are pushed
    // back into the pool so later rows with a name variant reuse them.
    const pool = (await prisma.member.findMany()).map(m => ({
      id: m.id, firstName: m.firstName, lastName: m.lastName,
    }))

    let paymentsCreated = 0
    let membersCreated = 0
    const errors: string[] = []

    // Re-uploading the same sheet must not double revenue — each row carries a
    // content-derived key on a unique column, so repeats are skipped.
    const keyed = withImportKeys('rev', rows, r => [r.studentName, r.date, r.amount, r.paymentMethod])
    const alreadyImported = new Set(
      (await prisma.payment.findMany({
        where: { importKey: { in: keyed.map(r => r.importKey) } },
        select: { importKey: true },
      })).map(p => p.importKey),
    )
    let paymentsSkipped = 0

    for (const row of keyed) {
      if (alreadyImported.has(row.importKey)) {
        paymentsSkipped++
        continue
      }
      if (!row.studentName || row.studentName.toLowerCase() === 'unknown') {
        errors.push(`Skipped "${row.studentName}" — no name`)
        continue
      }

      let member = resolveMember(row.studentName, pool)

      if (!member) {
        const parts = row.studentName.trim().replace(/["*]/g, '').split(/\s+/)
        const created = await prisma.member.create({
          data: {
            firstName: parts[0],
            lastName: parts.slice(1).join(' '),
            status: 'ACTIVE',
            packageType: row.packageType || null,
          },
        })
        member = { id: created.id, firstName: created.firstName, lastName: created.lastName }
        pool.push(member)
        membersCreated++
        errors.push(`No member matched "${row.studentName}" — created a new one`)
      }

      try {
        await prisma.payment.create({
          data: {
            memberId: member.id,
            amount: row.amount,
            method: mapMethod(row.paymentMethod),
            date: new Date(row.date),
            importKey: row.importKey,
            notes: [
              row.packageType && `Package: ${row.packageType}`,
              row.paymentMethod && `via ${row.paymentMethod}`,
              row.notes,
            ].filter(Boolean).join(' · ') || null,
          },
        })
        paymentsCreated++
      } catch (err) {
        // A concurrent import can win the race to the unique key — that is the
        // constraint doing its job, not a failure.
        if (String(err).includes('Unique constraint')) paymentsSkipped++
        else errors.push(`${row.studentName}: ${String(err)}`)
      }
    }

    return NextResponse.json({ paymentsCreated, paymentsSkipped, membersCreated, errors })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
