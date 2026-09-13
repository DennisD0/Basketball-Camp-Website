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
import { guessSportFromTeam, isSport, type Sport } from '@/lib/sports'

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

/**
 * A student's sport, read from their class label.
 *
 * Registration students carry the sport in the label ("Developing Volleyball").
 * Students imported from the Student & Packages sheet carry a class *time*
 * instead ("Friday 5pm", "Saturday 12:00 PM") — nearly half the live roster —
 * so a sport-name match alone left them on every day's attendance list. For
 * those, the weekday in the label is looked up on the same schedule the
 * attendance page uses, so the two can never disagree.
 *
 * Null when the label names no sport and no weekday, or a weekday that more
 * than one sport trains on. Ambiguity is never resolved by picking one.
 */
export function sportForClassLabel(config: RegistrationConfig, label: string | null | undefined): Sport | null {
  const named = guessSportFromTeam(label)
  if (named) return named
  if (!label) return null

  const byDay = sportsByWeekday(config)
  const sports = new Set<Sport>()
  for (const day of weekdaysIn(label)) {
    for (const sport of byDay.get(day) ?? []) sports.add(sport)
  }
  return sports.size === 1 ? Array.from(sports)[0] : null
}
