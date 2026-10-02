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
  /**
   * Does this package also answer for the few days BEFORE it starts?
   *
   * True for the package a student opens when they join — see
   * `packageWindow` in lib/packages.ts, which is the only thing that
   * should decide this. Required rather than optional so a new caller cannot
   * quietly default it and show a different number than every other page.
   */
  claimsEarlierCheckIns: boolean
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
  /** Last day the package's sessions can be used. Null when there is no window. */
  expiresOn: Date | null
  /**
   * Check-ins counted from before the package's start date, under
   * `PACKAGE_GRACE_DAYS`. Surfaced so a coach can see why the number moved
   * rather than wondering where the extra session went.
   */
  claimedBeforeStart: number
}

/**
 * How long a package stays valid, in weeks.
 *
 * The contract sells the window with the package: "5 sessions — complete within
 * 7 weeks", "7 sessions — complete within 9 weeks" (see `lib/agreements.ts`).
 * Those two are the only windows anyone has agreed to, so they are the only
 * ones returned. The sheet's 8-, 10- and 14-session packages were never sold
 * with a deadline, and extrapolating one would put an invented "window closed"
 * warning on a real student's card.
 *
 * A drop-in is a day pass with no window to run out, so it gets null too.
 */
const CONTRACT_WINDOW_WEEKS: Record<number, number> = { 5: 7, 7: 9 }

export function packageWindowWeeks(sessionsTotal: number): number | null {
  return CONTRACT_WINDOW_WEEKS[sessionsTotal] ?? null
}

/** The date a package's sessions must be used by, or null for a drop-in. */
export function packageExpiry(startDate: Date, sessionsTotal: number): Date | null {
  const weeks = packageWindowWeeks(sessionsTotal)
  if (weeks === null) return null
  const end = new Date(startDate.getTime())
  end.setUTCDate(end.getUTCDate() + weeks * 7)
  return end
}

/**
 * Whole days from today until `date`; negative once it has passed.
 *
 * Both sides are read in UTC, the timezone package dates are stored in. That
 * keeps the answer identical on the server and in the browser — a member card
 * rendered one way during SSR and the other after hydration would flag a React
 * mismatch — at the cost of being a day out for a viewer reading it late at
 * night in a western timezone.
 */
export function daysUntil(date: Date, from: Date = new Date()): number {
  const day = 24 * 60 * 60 * 1000
  const a = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  const b = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  return Math.round((a - b) / day)
}

function pctOf(used: number, total: number): number {
  return Math.min(Math.round((used / Math.max(total, 1)) * 100), 100)
}

/**
 * How many days before a package starts a check-in can still be charged to it.
 *
 * Paperwork lags the gym. A parent pays on the Friday, the class is that same
 * evening, and the registration is approved on the Saturday — so the student's
 * package starts the day AFTER the session they have already attended, and that
 * session is charged to nothing at all. A coach sees "1 used, 2 all-time
 * check-ins" and a counter that is one session too generous.
 *
 * Two weeks is drawn to cover a slow week of admin without reaching back into a
 * different chapter of the student's history: check-ins older than this belong
 * to whatever they were enrolled in before, including the ones a merged
 * duplicate profile brings with it.
 */
export const PACKAGE_GRACE_DAYS = 14

/**
 * The earliest check-in date a package answers for.
 *
 * Its start date, except for the package a student opens when they join: that
 * one reaches back over `PACKAGE_GRACE_DAYS`, because nothing earlier exists to
 * charge those sessions to.
 */
export function windowStart(pkg: PackageWindow): Date {
  if (!pkg.claimsEarlierCheckIns) return pkg.startDate
  const start = new Date(pkg.startDate.getTime())
  start.setUTCDate(start.getUTCDate() - PACKAGE_GRACE_DAYS)
  return start
}

/** Check-ins that fall inside a package's window: on/after its start, before endDate. */
export function sessionsInWindow(pkg: PackageWindow, attendanceDates: Date[]): number {
  const start = windowStart(pkg).getTime()
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
    const start = activePackage.startDate.getTime()
    const claimedBeforeStart = attendanceDates.filter(
      d => d.getTime() >= windowStart(activePackage).getTime() && d.getTime() < start,
    ).length
    return {
      total,
      used,
      remaining: Math.max(0, total - used),
      pct: pctOf(used, total),
      allTime,
      source: 'package',
      packageType: activePackage.packageType,
      startDate: activePackage.startDate,
      expiresOn: packageExpiry(activePackage.startDate, total),
      claimedBeforeStart,
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
    // No package row means no start date, and a deadline counted from a date we
    // do not have would be fiction.
    expiresOn: null,
    claimedBeforeStart: 0,
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
