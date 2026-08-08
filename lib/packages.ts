import prisma from '@/lib/prisma'
import { derivePackageWindow } from '@/lib/sessions'

/** Midnight UTC today — matches how Session.date is stored, so a session logged
 *  today falls inside a package started today. */
export function utcToday(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/** Marks a package as import-managed: created by backfill, resynced by backfill.
 *  Packages opened by a coach (renewal) or by registration approval carry a
 *  different note and are never rewritten. */
export const BACKFILL_NOTE = 'Backfilled from Student & Packages sheet'

/** Stamped on the package created alongside a hand-added member. Distinct from
 *  BACKFILL_NOTE on purpose: it puts the package in the renewal class, so a
 *  later import never resyncs a student who is in no spreadsheet. */
export const MANUAL_ENTRY_NOTE = 'Created on manual entry'

/** Stamped on the package opened when staff approve a registration. */
export const REGISTRATION_NOTE = 'Created on registration approval'

/**
 * Reconcile every member's active package against the Student & Packages sheet,
 * using their check-in history to place the window so the number shown matches
 * the sheet exactly.
 *
 * Must run AFTER the Check-in CSV, since the window is derived from attendance.
 *
 * Two jobs, both required:
 *  - members with no active package get one — without this they sit on the legacy
 *    columns, which taking attendance never writes to, so their counter would
 *    never move again after a reset + re-import.
 *  - packages this function created are recomputed from the sheet's current
 *    figures, so editing Sessions Total/Used and re-importing actually changes
 *    what the app shows. Re-import declares the sheet authoritative, so an
 *    in-app check-in not reflected in the sheet is reverted — same rule the
 *    member columns have always followed.
 *
 * Idempotent: re-running with unchanged CSVs is a no-op.
 */
export async function backfillPackages(): Promise<{
  created: number
  resynced: number
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
  let resynced = 0
  let skipped = 0
  const details: { name: string; total: number; used: number; startDate: string; carried: number }[] = []

  for (const m of members) {
    const active = m.packages[0] ?? null

    // Coach-opened renewals and registration packages are authoritative — the
    // sheet must not overwrite a package a human deliberately started.
    if (active && active.notes !== BACKFILL_NOTE) {
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

    const data = {
      packageType: m.packageType,
      sessionsTotal: m.sessionsTotal,
      startDate,
      carriedUsed,
      notes: BACKFILL_NOTE,
    }

    if (!active) {
      await prisma.memberPackage.create({ data: { memberId: m.id, ...data } })
      created++
    } else if (
      active.sessionsTotal !== data.sessionsTotal ||
      active.carriedUsed !== data.carriedUsed ||
      active.startDate.getTime() !== startDate.getTime() ||
      active.packageType !== data.packageType
    ) {
      await prisma.memberPackage.update({ where: { id: active.id }, data })
      resynced++
    } else {
      skipped++
      continue
    }

    details.push({
      name: `${m.firstName} ${m.lastName}`.trim(),
      total: m.sessionsTotal,
      used: m.sessionsUsed,
      startDate: startDate.toISOString().slice(0, 10),
      carried: carriedUsed,
    })
  }

  return { created, resynced, skipped, details }
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
