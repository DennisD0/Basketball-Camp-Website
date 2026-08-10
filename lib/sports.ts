/**
 * Which sport a payment or an expense belongs to.
 *
 * The club runs basketball and volleyball out of the same books, so a single
 * Net Profit describes neither. Everything that decides "which sport is this"
 * lives here — the values, the labels, the colors and the guess rule — because
 * every other single-source-of-truth module in `lib/` exists precisely because
 * a second copy drifted.
 *
 * Client-safe on purpose: no prisma import, same reason as `lib/package-presets.ts`.
 * The finances dashboard is a client component and imports this directly.
 */

export type Sport = 'basketball' | 'volleyball'
/** Expenses add a third bucket; a payment is never "shared". */
export type ExpenseSport = Sport | 'shared'

export const SPORTS: readonly Sport[] = ['basketball', 'volleyball'] as const

export const EXPENSE_SPORTS: readonly ExpenseSport[] = [...SPORTS, 'shared'] as const

export const SPORT_LABELS: Record<ExpenseSport, string> = {
  basketball: 'Basketball',
  volleyball: 'Volleyball',
  shared:     'Shared',
}

/**
 * Brand tokens only — navy and teal are already the app's two primaries, and
 * keeping the brand schema is a standing constraint. Shared gets cream's
 * darker neighbour rather than a new hue so it reads as "neither of the two".
 */
export const SPORT_COLORS: Record<ExpenseSport, string> = {
  basketball: '#C85A1E', // brand orange — the ball
  volleyball: '#2C6E6A', // brand teal
  shared:     '#2D3875', // brand navy
}

/** What an untagged row is called wherever it is surfaced. */
export const UNASSIGNED_LABEL = 'Unassigned'
export const UNASSIGNED_COLOR = '#6b7280'

export function isSport(value: unknown): value is Sport {
  return typeof value === 'string' && (SPORTS as readonly string[]).includes(value)
}

export function isExpenseSport(value: unknown): value is ExpenseSport {
  return typeof value === 'string' && (EXPENSE_SPORTS as readonly string[]).includes(value)
}

/** `SPORT_LABELS` with a fallback, so an unknown stored value still renders. */
export function sportLabel(value: string | null | undefined): string {
  if (!value) return UNASSIGNED_LABEL
  return SPORT_LABELS[value as ExpenseSport] ?? value
}

export function sportColor(value: string | null | undefined): string {
  if (!value) return UNASSIGNED_COLOR
  return SPORT_COLORS[value as ExpenseSport] ?? UNASSIGNED_COLOR
}

/**
 * Infer a sport from a member's class label, e.g. "U12 Volleyball".
 *
 * `Member.teamAssignment` is free text straight from the Student & Packages
 * sheet — nullable, unvalidated, and whatever the client happened to type. It
 * is the only sport signal that exists on historical records, which is why
 * this is a *guess* used to prefill a control, never applied silently.
 *
 * Returns null when the label names both sports or neither. Ambiguity is not
 * resolved by picking one, the same rule `lib/name-match.ts` follows for names
 * that match more than one member.
 */
export function guessSportFromTeam(teamAssignment: string | null | undefined): Sport | null {
  if (!teamAssignment) return null
  const haystack = teamAssignment.toLowerCase()
  const matched = SPORTS.filter(s => haystack.includes(s))
  return matched.length === 1 ? matched[0] : null
}

/**
 * First unambiguous sport across several pieces of free text, in the order
 * given. Order is the whole point: a package label attached to the payment
 * itself ("volleyball_7_sessions") describes that payment, while the member's
 * class label only describes the member — and a member can play both. Pass the
 * narrowest source first.
 */
export function guessSport(...sources: (string | null | undefined)[]): Sport | null {
  for (const source of sources) {
    const guess = guessSportFromTeam(source)
    if (guess) return guess
  }
  return null
}
