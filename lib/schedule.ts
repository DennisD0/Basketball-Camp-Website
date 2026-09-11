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
import { isSport, type Sport } from '@/lib/sports'

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
function weekdaysIn(slotTime: string): number[] {
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
