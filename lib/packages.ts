import prisma from '@/lib/prisma'
import { derivePackageWindow } from '@/lib/sessions'

/** Midnight UTC today — matches how Session.date is stored, so a session logged
 *  today falls inside a package started today. */
export function utcToday(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/**
 * Give every member without an active package one, reconstructed from their
 * sheet counts plus check-in history so the numbers shown today do not move.
 *
 * Idempotent: members who already have an active package are left alone, so this
 * is safe to re-run after each CSV import.
 */
export async function backfillPackages(): Promise<{
  created: number
  skipped: number
  details: { name: string; total: number; used: number; startDate: string; carried: number }[]
}> {
  const members = await prisma.member.findMany({
    include: {
      packages: { where: { endDate: null } },
      attendance: {
        where: { status: 'PRESENT' },
        include: { session: { select: { date: true } } },
      },
    },
  })

  let created = 0
  let skipped = 0
  const details: { name: string; total: number; used: number; startDate: string; carried: number }[] = []

  for (const m of members) {
    if (m.packages.length > 0) {
      skipped++
      continue
    }

    const dates = m.attendance
      .map(a => a.session.date)
      .sort((a, b) => a.getTime() - b.getTime())

    const { startDate, carriedUsed } = derivePackageWindow(
      m.sessionsUsed,
      dates,
      m.enrollmentDate,
    )

    await prisma.memberPackage.create({
      data: {
        memberId: m.id,
        packageType: m.packageType,
        sessionsTotal: m.sessionsTotal,
        startDate,
        carriedUsed,
        notes: 'Backfilled from Student & Packages sheet',
      },
    })

    created++
    details.push({
      name: `${m.firstName} ${m.lastName}`.trim(),
      total: m.sessionsTotal,
      used: m.sessionsUsed,
      startDate: startDate.toISOString().slice(0, 10),
      carried: carriedUsed,
    })
  }

  return { created, skipped, details }
}

/**
 * Renew: close the student's current package and open a fresh one. Check-ins
 * from `startDate` onward count against the new package, so the counter resets
 * without touching any attendance history.
 */
export async function openNewPackage(
  memberId: string,
  opts: { sessionsTotal: number; packageType?: string | null; startDate?: Date; notes?: string | null },
) {
  const startDate = opts.startDate ?? utcToday()

  return prisma.$transaction(async tx => {
    // Close any package still open, so exactly one is ever active.
    await tx.memberPackage.updateMany({
      where: { memberId, endDate: null },
      data: { endDate: startDate },
    })

    const pkg = await tx.memberPackage.create({
      data: {
        memberId,
        packageType: opts.packageType ?? null,
        sessionsTotal: opts.sessionsTotal,
        startDate,
        carriedUsed: 0,
        notes: opts.notes ?? null,
      },
    })

    // Keep the legacy columns consistent for anything still reading them
    // (CSV export, import diffing) — the package row is authoritative.
    await tx.member.update({
      where: { id: memberId },
      data: { sessionsTotal: opts.sessionsTotal, sessionsUsed: 0, packageType: opts.packageType ?? undefined },
    })

    return pkg
  })
}
