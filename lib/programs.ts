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
