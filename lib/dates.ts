// Dates are stored as UTC midnight. Parsing them directly in a negative-offset
// timezone (e.g. EDT = UTC-4) yields the previous calendar day. Forcing noon UTC
// makes any timezone render the correct calendar date.
export function asLocalDate(s: string | Date): Date {
  const iso = s instanceof Date ? s.toISOString() : s
  return new Date(iso.slice(0, 10) + 'T12:00:00Z')
}
