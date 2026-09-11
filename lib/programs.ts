export const PROGRAM_LABELS: Record<string, string> = {
  basketball_5_sessions: 'Basketball — 5 Sessions',
  basketball_7_sessions: 'Basketball — 7 Sessions',
  basketball_drop_in:    'Basketball — Drop-in',
  volleyball_5_sessions: 'Volleyball — 5 Sessions',
  volleyball_7_sessions: 'Volleyball — 7 Sessions',
  volleyball_drop_in:    'Volleyball — Drop-in',
  // legacy keys (keep for existing records)
  basketball_early_bird:   'Basketball — Early Bird',
  basketball_memorial_day: 'Basketball — Best Deal',
  basketball_regular:      'Basketball — Standard',
  volleyball_early_bird:   'Volleyball — Early Bird',
  volleyball_memorial_day: 'Volleyball — Best Deal',
  volleyball_regular:      'Volleyball — Standard',
}

export const PROGRAM_PRICES: Record<string, string> = {
  basketball_5_sessions: '$150',
  basketball_7_sessions: '$200',
  basketball_drop_in:    '$32/class',
  volleyball_5_sessions: '$150',
  volleyball_7_sessions: '$200',
  volleyball_drop_in:    '$32/class',
  // legacy keys
  basketball_early_bird:   '$350',
  basketball_memorial_day: '$300',
  basketball_regular:      '$400',
  volleyball_early_bird:   '$350',
  volleyball_memorial_day: '$300',
  volleyball_regular:      '$400',
  // The oldest records store the tier without a sport prefix. Without these
  // they resolve to no price at all and render as an em-dash.
  early_bird:   '$350',
  memorial_day: '$300',
  regular:      '$400',
}

export const PROGRAM_SESSIONS: Record<string, number> = {
  basketball_5_sessions: 5,
  basketball_7_sessions: 7,
  basketball_drop_in:    1,
  volleyball_5_sessions: 5,
  volleyball_7_sessions: 7,
  volleyball_drop_in:    1,
}

// ── Resolving a registration's program ──────────────────────────────────────

import type { SessionPackage } from '@/lib/registration-config'

/** Packages sold before they became staff-editable. */
const LEGACY_PACKAGES: Record<string, { label: string; sessions: number; window: string }> = {
  '5-week': { label: '5-Week Package', sessions: 5, window: '7 weeks' },
  '7-week': { label: '7-Week Package', sessions: 7, window: '9 weeks' },
}

export type ResolvedProgram = {
  /** Sport plus package name, e.g. "Volleyball — 7 sessions". */
  title: string
  packageLabel: string
  sportLabel: string
  price: string
  sessions: number | string
  /** How long the sessions stay valid, e.g. "Complete within 9 weeks". */
  window: string
  description: string
}

/**
 * Work out what a registration actually bought.
 *
 * Staff can add packages from the registration editor, and those carry a
 * generated value like `package_1785855391156` that no hardcoded map can know.
 * Three separate copies of such a map had drifted — on the contract, on the
 * registrations list and in the approval email — and each one fell through to
 * printing that raw key with no price. Resolve from the live config first and
 * keep the maps only for records that predate it.
 *
 * Pass `packages` from the saved registration config.
 */
export function resolveProgram(
  reg: { packageOption: string; programOption: string; sport: string },
  packages: SessionPackage[],
): ResolvedProgram {
  const cfg = packages.find(p => p.value === reg.packageOption)
  const legacy = LEGACY_PACKAGES[reg.packageOption]

  const packageLabel = cfg?.label ?? legacy?.label ?? reg.packageOption
  const sportLabel = reg.sport ? reg.sport.charAt(0).toUpperCase() + reg.sport.slice(1) : ''

  // The legacy maps key off programOption and already include the sport.
  const title = PROGRAM_LABELS[reg.programOption]
    ?? (sportLabel ? `${sportLabel} — ${packageLabel}` : packageLabel)

  return {
    title,
    packageLabel,
    sportLabel,
    price:       cfg?.price ?? PROGRAM_PRICES[reg.programOption] ?? '—',
    sessions:    cfg?.sessions ?? legacy?.sessions ?? '—',
    window:      cfg?.highlight ?? legacy?.window ?? '—',
    description: cfg?.description?.trim() ?? '',
  }
}

/**
 * How many sessions a registration actually bought.
 *
 * Approval used to read `packageOption === '5-week' ? 5 : 7`, a two-case guess
 * written when those were the only two packages that existed. Every value the
 * form sends today — `5_sessions`, `drop_in`, a staff-created
 * `package_1785855391156` — fell through the `:` and became 7, so a parent who
 * picked 5 sessions was credited with 7. Same class of bug as the three drifted
 * label maps above, and the same fix: read the live config first.
 *
 * Order is narrowest-source-first, like `guessSport`:
 *   1. the package the parent actually clicked, from the saved config
 *   2. the two packages sold before the config existed
 *   3. the sport-prefixed program key (`basketball_5_sessions`)
 *   4. a leading number in the value itself (`5_sessions`, `5-week`)
 *
 * Returns null when none of those answer — a package staff renamed to something
 * with no number in it and then deleted from the config. The caller decides what
 * to do with that rather than being handed a made-up number.
 */
export function resolveSessionsTotal(
  reg: { packageOption: string; programOption: string },
  packages: SessionPackage[],
): number | null {
  const cfg = packages.find(p => p.value === reg.packageOption)
  if (cfg && Number.isInteger(cfg.sessions) && cfg.sessions > 0) return cfg.sessions

  const legacy = LEGACY_PACKAGES[reg.packageOption]
  if (legacy) return legacy.sessions

  const byProgram = PROGRAM_SESSIONS[reg.programOption]
  if (byProgram) return byProgram

  // "5_sessions" / "5-week" / "7 sessions" — the count is in the value itself.
  const digits = reg.packageOption?.match(/^(\d+)\s*[-_ ]/)
  if (digits) {
    const n = parseInt(digits[1], 10)
    if (n >= 1 && n <= 100) return n
  }

  return null
}
