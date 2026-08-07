/**
 * Single source of truth for "how many sessions does this student have left".
 *
 * Every page must use `summarizeSessions`. The 0-sessions-remaining bug shipped
 * because members/[id] and attendance/[date] each hand-rolled their own formula
 * and drifted apart; keeping the arithmetic in one place is the fix.
 *
 * The rule that matters: sessions used is scoped to the student's CURRENT
 * package. All-time attendance spans every package they have ever bought, so it
 * must never be compared against a single package's session total.
 */

export type PackageWindow = {
  sessionsTotal: number
  startDate: Date
  endDate: Date | null
  carriedUsed: number
  packageType: string | null
}

export type LegacyCounts = {
  sessionsTotal: number
  sessionsUsed: number
}

export type SessionSummary = {
  total: number
  used: number
  remaining: number
  /** Progress-bar fill, 0-100, clamped. */
  pct: number
  /** Check-ins across every package ever — display only, never used in arithmetic. */
  allTime: number
  /** 'package' once the student has a package row; 'legacy' for un-migrated members. */
  source: 'package' | 'legacy'
  packageType: string | null
  startDate: Date | null
}

function pctOf(used: number, total: number): number {
  return Math.min(Math.round((used / Math.max(total, 1)) * 100), 100)
}

/** Check-ins that fall inside a package's window: on/after startDate, before endDate. */
export function sessionsInWindow(pkg: PackageWindow, attendanceDates: Date[]): number {
  const start = pkg.startDate.getTime()
  const end = pkg.endDate ? pkg.endDate.getTime() : Infinity
  return attendanceDates.filter(d => {
    const t = d.getTime()
    return t >= start && t < end
  }).length
}

/**
 * @param attendanceDates PRESENT session dates for this member (any order).
 */
export function summarizeSessions(
  legacy: LegacyCounts,
  activePackage: PackageWindow | null,
  attendanceDates: Date[],
): SessionSummary {
  const allTime = attendanceDates.length

  if (activePackage) {
    // Derived, not stored — so taking attendance decrements the package with no
    // write-back, and renewing resets the count by opening a new window.
    const total = activePackage.sessionsTotal
    const used = activePackage.carriedUsed + sessionsInWindow(activePackage, attendanceDates)
    return {
      total,
      used,
      remaining: Math.max(0, total - used),
      pct: pctOf(used, total),
      allTime,
      source: 'package',
      packageType: activePackage.packageType,
      startDate: activePackage.startDate,
    }
  }

  // No package row yet. Trust the coach-maintained sheet figure as-is.
  // Do NOT Math.max() this against `allTime` — that was the bug (see a4e5e71).
  return {
    total: legacy.sessionsTotal,
    used: legacy.sessionsUsed,
    remaining: Math.max(0, legacy.sessionsTotal - legacy.sessionsUsed),
    pct: pctOf(legacy.sessionsUsed, legacy.sessionsTotal),
    allTime,
    source: 'legacy',
    packageType: null,
    startDate: null,
  }
}

/**
 * Work out the window for a student's current package when all we have is the
 * sheet's "Sessions Used" figure and their check-in history.
 *
 * We pick the startDate so that exactly `sessionsUsed` of their existing
 * check-ins fall inside it — i.e. their most recent `sessionsUsed` visits are
 * the ones charged to this package, and everything earlier belonged to packages
 * they already finished. That reproduces the sheet's number exactly today while
 * making every future check-in decrement correctly.
 *
 * @param attendanceDatesAsc PRESENT session dates, sorted oldest-first.
 * @param fallbackStart Used when the student has no check-ins at all.
 */
export function derivePackageWindow(
  sessionsUsed: number,
  attendanceDatesAsc: Date[],
  fallbackStart: Date,
): { startDate: Date; carriedUsed: number } {
  const total = attendanceDatesAsc.length
  const used = Math.max(0, sessionsUsed)

  // Sheet says more sessions burned than we have check-ins for: the difference
  // predates check-in tracking, so carry it.
  if (used >= total) {
    return {
      startDate: total > 0 ? attendanceDatesAsc[0] : fallbackStart,
      carriedUsed: used - total,
    }
  }

  // Nothing burned yet — start the window after their last visit so no existing
  // check-in counts against it.
  if (used === 0) {
    const last = attendanceDatesAsc[total - 1]
    const startDate = new Date(last.getTime())
    startDate.setUTCDate(startDate.getUTCDate() + 1)
    return { startDate, carriedUsed: 0 }
  }

  // Charge exactly the most recent `used` visits to this package.
  return { startDate: attendanceDatesAsc[total - used], carriedUsed: 0 }
}
