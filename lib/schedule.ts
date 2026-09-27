/**
 * Which sport trains on which day.
 *
 * Basketball runs Tuesdays and Fridays, volleyball Saturdays — so a coach taking
 * attendance on a Tuesday should be handed the basketball roster, not all 30
 * students. That mapping already exists in exactly one place staff maintain: the
 * session slots on the registration form ("Tue 4–5PM", "Sat 1–3PM"). Reading it
 * from there means adding a Thursday volleyball class on the registration editor
 * changes the attendance sheet too, with nothing to keep in sync by hand.
 *
 * Client-safe: no prisma import, so the take-attendance component can use it.
 */

import type { RegistrationConfig } from '@/lib/registration-config'
import { guessSportFromTeam, isSport, SPORTS, type Sport } from '@/lib/sports'

/** Day abbreviations as the slot labels spell them. */
const DAY_TOKENS: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
}

/** Every weekday named in a slot label. "Tue & Thu 4–5PM" is two days, not one. */
export function weekdaysIn(slotTime: string): number[] {
  const days = new Set<number>()
  for (const word of slotTime.toLowerCase().match(/[a-z]+/g) ?? []) {
    const day = DAY_TOKENS[word]
    if (day !== undefined) days.add(day)
  }
  return Array.from(days)
}

/**
 * Weekday (0 = Sunday) → the sports that train that day, in config order.
 * A day nobody trains is simply absent.
 */
export function sportsByWeekday(config: RegistrationConfig): Map<number, Sport[]> {
  const byDay = new Map<number, Sport[]>()

  for (const entry of config.sports) {
    const sport = entry.sport.trim().toLowerCase()
    // Staff can name a schedule block anything; only the two sports the rest of
    // the app knows about can scope a roster.
    if (!isSport(sport)) continue

    for (const slot of entry.slots) {
      for (const day of weekdaysIn(slot.time)) {
        const list = byDay.get(day) ?? []
        if (!list.includes(sport)) list.push(sport)
        byDay.set(day, list)
      }
    }
  }

  return byDay
}

/**
 * The sports scheduled on a given date, as `yyyy-mm-dd`.
 *
 * Empty means no class is on the calendar that day — a make-up session, or a
 * schedule staff have not filled in. The caller shows everyone rather than an
 * empty roster: guessing a sport for an off-schedule day would hide students a
 * coach is standing in front of.
 */
export function scheduledSports(config: RegistrationConfig, date: string): Sport[] {
  // Noon UTC, same reason as lib/dates.ts: parsing a bare date in a negative
  // offset lands on the previous day, which would read Saturday as Friday.
  const weekday = new Date(date + 'T12:00:00Z').getUTCDay()
  return sportsByWeekday(config).get(weekday) ?? []
}

/**
 * The sport a class label that names no sport belongs to.
 *
 * Only the Student & Packages sheet writes labels like that ("Friday 5pm",
 * "Saturday 12:00 PM"), and that sheet is the basketball roster: volleyball
 * students have only ever arrived through the registration form, which writes
 * the sport into the label. Reading the weekday instead was tried and was
 * wrong — before volleyball launched, Saturday was a basketball class too, so
 * "Saturday 12:00 PM" sorted eight basketball students onto the volleyball
 * roster. Confirmed with the club on 2026-09-14.
 */
export const SHEET_LABEL_SPORT: Sport = 'basketball'

/**
 * A student's sport, read from their class label.
 *
 * A label naming exactly one sport ("Developing Volleyball") says so directly.
 * Any other non-empty label that names no sport is a sheet class time, see
 * `SHEET_LABEL_SPORT`. Null for an empty label or one naming both sports —
 * those students stay on every roster rather than being guessed at.
 */
export function sportForClassLabel(label: string | null | undefined): Sport | null {
  const named = guessSportFromTeam(label)
  if (named) return named
  if (!label?.trim()) return null
  const lower = label.toLowerCase()
  if (SPORTS.some(s => lower.includes(s))) return null
  return SHEET_LABEL_SPORT
}


/**
 * Is this class label one the Student & Packages sheet wrote?
 *
 * The sheet labels a student by when their class ran — "Friday 4pm", "Saturday
 * 12:00 PM" — while the registration form writes an age range and a sport,
 * "Ages 5–9 Basketball". Students who arrived through both are on the roster
 * twice, and it is the sheet copy that is stale.
 *
 * Deliberately narrow, because the answer decides what a cleanup offers to
 * delete: the label must name a weekday AND no sport. A team a coach typed by
 * hand ("U14 Boys") names neither and is left alone; anything naming a sport is
 * a registration label whatever else it says.
 */
export function isSheetClassLabel(label: string | null | undefined): boolean {
  if (!label?.trim()) return false
  const lower = label.toLowerCase()
  if (SPORTS.some(s => lower.includes(s))) return false
  return weekdaysIn(label).length > 0
}
