import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

interface RevenueRow {
  studentName: string
  packageType: string
  paymentMethod: string
  amount: number
  date: string
  notes?: string
}

function normalize(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[*"()]/g, '').trim()
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
    const members = await prisma.member.findMany()

    // Build lookup: normalized full name → member
    const byFull = new Map<string, typeof members[0]>()
    const byFirst = new Map<string, typeof members[0][]>()
    for (const m of members) {
      const full = normalize(`${m.firstName} ${m.lastName}`)
      byFull.set(full, m)
      const first = normalize(m.firstName)
      if (!byFirst.has(first)) byFirst.set(first, [])
      byFirst.get(first)!.push(m)
    }

    function findMember(name: string) {
      const n = normalize(name)
      if (byFull.has(n)) return byFull.get(n)!
      // Try first name only if single-word input
      const firstWord = n.split(' ')[0]
      const candidates = byFirst.get(firstWord) ?? []
      if (candidates.length === 1) return candidates[0]
      // Partial: member full name contains the input
      for (const [key, m] of byFull) {
        if (key.includes(n) || n.includes(key.split(' ')[0])) return m
      }
      return null
    }

    let paymentsCreated = 0
    let membersCreated = 0
    const errors: string[] = []

    for (const row of rows) {
      if (!row.studentName || row.studentName.toLowerCase() === 'unknown') {
        errors.push(`Skipped "${row.studentName}" — no name`)
        continue
      }

      let member = findMember(row.studentName)

      if (!member) {
        const parts = row.studentName.trim().split(/\s+/)
        member = await prisma.member.create({
          data: {
            firstName: parts[0],
            lastName: parts.slice(1).join(' '),
            status: 'ACTIVE',
            packageType: row.packageType || null,
          },
        })
        // Add to local maps for subsequent rows with same name
        byFull.set(normalize(`${member.firstName} ${member.lastName}`), member)
        membersCreated++
      }

      try {
        await prisma.payment.create({
          data: {
            memberId: member.id,
            amount: row.amount,
            method: mapMethod(row.paymentMethod),
            date: new Date(row.date),
            notes: [
              row.packageType && `Package: ${row.packageType}`,
              row.paymentMethod && `via ${row.paymentMethod}`,
              row.notes,
            ].filter(Boolean).join(' · ') || null,
          },
        })
        paymentsCreated++
      } catch (err) {
        errors.push(`${row.studentName}: ${String(err)}`)
      }
    }

    return NextResponse.json({ paymentsCreated, membersCreated, errors })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
