/**
 * Shared student-name resolution for CSV imports.
 *
 * The source spreadsheets spell the same student differently across tabs
 * ("Brian Zhai" vs "Bryan Zhai", "Brighton Lee" vs "Brighton", `Soichiro "Z" Abe`
 * vs "Soichiro Abe"). Without a shared resolver each import tab creates its own
 * duplicate member, which is how 21 students became 33 rows.
 *
 * Rules are applied in order, most-confident first, and every rule requires a
 * UNIQUE match — an ambiguous name is left unresolved on purpose rather than
 * guessed at.
 */

export interface NameCandidate {
  id: string
  firstName: string
  lastName: string
}

/** Size qualifiers the sheets use interchangeably to tell two same-name kids apart. */
const QUALIFIER_SYNONYMS: Record<string, string> = {
  small: 'short', short: 'short',
  big: 'tall', tall: 'tall', long: 'tall',
}

/**
 * A trailing size word written in lowercase ("Ian short") is a qualifier, not a
 * surname. Case matters: "Ian Short" is left alone, since Short/Small/Long are
 * real surnames. "long" is excluded entirely — too common a surname to risk.
 */
const BARE_QUALIFIER = /\s+(small|short|big|tall)\s*$/

/** Lowercase, strip quotes/asterisks/"#2" markers and qualifiers, collapse whitespace. */
function base(raw: string): string {
  return raw
    .replace(/["*]/g, '')
    .replace(/#\s*\d+/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(BARE_QUALIFIER, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** The parenthetical or trailing size qualifier, normalized — "" if none. */
function qualifier(raw: string): string {
  const paren = raw.match(/\(([^)]*)\)/)
  const word = paren
    ? paren[1].trim().toLowerCase()
    : (raw.replace(/["*]/g, '').match(BARE_QUALIFIER)?.[1] ?? '')
  return QUALIFIER_SYNONYMS[word] ?? ''
}

/** Drop single-letter tokens (middle initials): "soichiro z abe" → "soichiro abe". */
function withoutInitials(s: string): string {
  const parts = s.split(' ').filter(p => p.length > 1)
  return parts.length ? parts.join(' ') : s
}

/** Full comparison key: base name + qualifier, so "ian kim (short)" ≠ "ian kim (tall)". */
export function nameKey(raw: string): string {
  const q = qualifier(raw)
  return q ? `${base(raw)} (${q})` : base(raw)
}

/** Edit distance, capped — we only care about "off by one typo". */
function within1(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0, j = 0, edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++edits > 1) return false
    if (a.length > b.length) i++
    else if (a.length < b.length) j++
    else { i++; j++ }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

function unique<T>(matches: T[]): T | null {
  return matches.length === 1 ? matches[0] : null
}

/**
 * Resolve a spreadsheet name against known members.
 * Returns null when there is no match OR when the name is ambiguous.
 *
 * `strict` disables every fuzzy rule and compares exact keys only. Use it for
 * the Student & Packages sheet, which DEFINES the roster: two of its rows
 * ("Ian Kim" and "Ian Kim (short)") are two real students and must never be
 * collapsed into one. Other sheets reconcile against that roster and want the
 * fuzzy rules.
 */
export function resolveMember<T extends NameCandidate>(
  raw: string,
  members: T[],
  opts: { strict?: boolean } = {},
): T | null {
  if (!raw?.trim()) return null

  const full = (m: T) => `${m.firstName} ${m.lastName}`.trim()
  const key = nameKey(raw)
  const b = base(raw)
  const q = qualifier(raw)

  // 1. Exact key (name + qualifier)
  const exact = unique(members.filter(m => nameKey(full(m)) === key))
  if (exact) return exact
  if (opts.strict) return null

  /**
   * Pick from same-name candidates using the qualifier.
   *
   * Qualifiers are load-bearing: "Ian Kim" and "Ian Kim (short)" are two
   * different students, so a qualified input must never fall back to an
   * arbitrary same-base member. It may only land on the single UNQUALIFIED
   * member — the sheets treat the unmarked spelling as the default kid, so
   * "(tall)" resolves to plain "Ian Kim" when no "(tall)" row exists.
   */
  function pick(candidates: T[]): T | null {
    if (!candidates.length) return null
    const sameQ = unique(candidates.filter(m => qualifier(full(m)) === q))
    if (sameQ) return sameQ
    if (q) return unique(candidates.filter(m => !qualifier(full(m))))
    return unique(candidates)
  }

  // 2. Same base name, ignoring middle initials
  const bNoInit = withoutInitials(b)
  const sameBase = pick(members.filter(m => withoutInitials(base(full(m))) === bNoInit))
  if (sameBase) return sameBase

  // 3. Single-word input (first name only) matching exactly one member's first name
  if (!b.includes(' ')) {
    const byFirst = pick(members.filter(m => base(m.firstName) === b))
    if (byFirst) return byFirst
  }

  // 4. Input is a prefix of exactly one member's full name ("Vasili" → "Vasili Asimakopoulos")
  const prefix = pick(members.filter(m => base(full(m)).startsWith(b + ' ')))
  if (prefix) return prefix

  // 5. One-character typo on the full name ("Bryan Zhai" → "Brian Zhai")
  const typo = pick(members.filter(m => within1(withoutInitials(base(full(m))), bNoInit)))
  if (typo) return typo

  return null
}
