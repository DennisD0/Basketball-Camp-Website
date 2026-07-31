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

    const touchedIds: string[] = []

    for (const row of rows) {
      if (!row.firstName) continue
      // Strict: never merge two rows from this sheet with each other.
      // Fallback: if Check-in was imported first it may have created a stub
      // member with only a first name — detect that and update it instead of
      // creating a duplicate.
      let existing = resolveMember(`${row.firstName} ${row.lastName ?? ''}`, pool, { strict: true })
      if (!existing && row.lastName?.trim()) {
        const fn = row.firstName.trim().toLowerCase()
        const stubs = pool.filter(m => m.lastName === '' && m.firstName.toLowerCase() === fn)
        if (stubs.length === 1) existing = stubs[0]
      }

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
          const isStub = !existing.lastName.trim()
          const updateData = isStub
            ? { firstName: row.firstName.trim(), lastName: (row.lastName ?? '').trim(), ...data }
            : data
          await prisma.member.update({ where: { id: existing.id }, data: updateData })
          if (isStub) {
            const idx = pool.findIndex(m => m.id === existing!.id)
            if (idx >= 0) {
              pool[idx].firstName = row.firstName.trim()
              pool[idx].lastName = (row.lastName ?? '').trim()
            }
          }
          touchedIds.push(existing.id)
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
          touchedIds.push(m.id)
          created++
        }
      } catch (err) {
        errors.push(`${row.firstName} ${row.lastName}: ${String(err)}`)
      }
    }

    // After writing S&P sessionsUsed values, sync upward with actual attendance
    // so re-importing S&P never overwrites a higher count from the Check-in sheet.
    if (touchedIds.length > 0) {
      const [counts, members] = await Promise.all([
        prisma.attendance.groupBy({
          by: ['memberId'],
          where: { memberId: { in: touchedIds }, status: 'PRESENT' },
          _count: { memberId: true },
        }),
        prisma.member.findMany({
          where: { id: { in: touchedIds } },
          select: { id: true, sessionsUsed: true },
        }),
      ])
      const currentMap = Object.fromEntries(members.map(m => [m.id, m.sessionsUsed]))
      await Promise.all(
        counts
          .map(({ memberId, _count }) => {
            const newVal = Math.max(currentMap[memberId] ?? 0, _count.memberId)
            return newVal > (currentMap[memberId] ?? 0)
              ? prisma.member.update({ where: { id: memberId }, data: { sessionsUsed: newVal } })
              : null
          })
          .filter((p): p is NonNullable<typeof p> => p !== null)
      )
    }

    return NextResponse.json({ created, updated, errors })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
