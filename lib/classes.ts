/**
 * A class, not a day.
 *
 * Attendance used to be keyed on the date alone: one `Session` row per calendar
 * day, `@@unique([date])`. That works until two classes run on the same day —
 * "Fri 4–5PM (ages 5–9)" and "Fri 5–6PM (ages 9–12)" — and then it actively
 * destroys data. Both classes shared one session row, both were shown the whole
 * basketball roster, and saving the 5PM class re-wrote every 4PM student to
 * ABSENT because they were not ticked on screen. Coaches saw exactly that:
 * "it erases the attendance taken from other kids", and a student whose only
 * check-in had been overwritten sat at 7 of 7 sessions remaining.
 *
 * So a session is now (date, class). This module is the one place that decides
 * what a class is, which classes run on a given date, and which students belong
 * to each — read off the session slots staff already maintain on the
 * registration form, the same source `lib/schedule.ts` reads for sports.
 *
 * Client-safe: no prisma import, so the take-attendance component can use it.
 */

import type { RegistrationConfig } from '@/lib/registration-config'
import { sportForClassLabel, weekdaysIn } from '@/lib/schedule'
import { isSport, SPORT_LABELS, type Sport } from '@/lib/sports'

/**
 * The roster tab that shows everyone regardless of schedule — a make-up, a
 * joint session, or a day with no class on the calendar. Saving under it
 * records one session for the whole day, which is the old behaviour, kept
 * deliberately for the case it was actually right for.
 */
export const ALL_CLASSES_KEY = 'all'

/**
 * Sessions recorded before attendance was split per class. Empty rather than
 * null so `@@unique([date, classKey])` still rejects a duplicate whole-day row;
 * Postgres treats two NULLs as distinct.
 */
export const LEGACY_CLASS_KEY = ''

export type ClassSlot = {
  /** Stable id for the session row, e.g. `basketball:fri-4-5pm`. */
  key: string
  sport: Sport
  /** The slot label staff typed, e.g. "Fri 4–5PM". */
  time: string
  /** The slot's age range, e.g. "Ages 5–9". */
  ages: string
  /** What a coach sees on the tab, e.g. "Basketball · Fri 4–5PM". */
  label: string
  /** 0 = Sunday. More than one when a slot names several days. */
  weekdays: number[]
  /** Minutes past midnight the class starts, or null if the label has no time. */
  startMinutes: number | null
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/**
 * The session row's key for a slot.
 *
 * Derived from the slot rather than stored on it, because the registration
 * config has no ids — staff edit a plain list of {time, ages}. Renaming a slot
 * therefore starts a new key, and sessions already recorded under the old one
 * keep their own `classLabel` so the history still reads correctly.
 */
export function classKeyFor(sport: string, time: string): string {
  return `${slug(sport)}:${slug(time)}`
}

/**
 * A time range — "Fri 4–5PM", "Sat 1–3PM". The meridiem is written once, on
 * the end of the range, so the opening hour has to borrow it.
 */
const TIME_RANGE = /(\d{1,2})(?::(\d{2}))?\s*(?:([ap])\.?\s*m\.?)?\s*[\u2013\u2014-]\s*\d{1,2}(?::\d{2})?\s*([ap])\.?\s*m\.?/i

/** A single time — "Friday 4pm", "Saturday 12:00 PM". */
const TIME_SINGLE = /(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?/i

/**
 * Minutes past midnight for the time a label opens at: 960 for "Fri 4–5PM".
 *
 * A meridiem is required, and it is what makes this safe to run over a member's
 * class label as well as a slot's. Without that rule the digits in "Ages 5–9
 * Basketball" read as five o'clock and a whole age group lands on the wrong
 * class — while every label that really names a time carries one, whether staff
 * typed "Fri 4–5PM" or the spreadsheet wrote "Saturday 12:00 PM".
 *
 * Null when the label names no time at all, which is the common case for a
 * label written from the registration form.
 */
export function startMinutesIn(text: string | null | undefined): number | null {
  if (!text) return null

  const range = text.match(TIME_RANGE)
  const single = range ? null : text.match(TIME_SINGLE)
  const m = range ?? single
  if (!m) return null

  const meridiem = (range ? (m[3] ?? m[4]) : m[3]).toLowerCase()
  let hour = parseInt(m[1], 10)
  const minute = m[2] ? parseInt(m[2], 10) : 0
  if (!Number.isFinite(hour) || hour < 1 || hour > 12 || minute > 59) return null

  if (meridiem === 'p' && hour !== 12) hour += 12
  if (meridiem === 'a' && hour === 12) hour = 0
  return hour * 60 + minute
}

/**
 * An age range reduced to something comparable across two spellings.
 *
 * "Ages 5–9" on the slot and "Ages 5-9 Basketball" on the member are the same
 * range written with different dashes and a sport bolted on. Numbers win when
 * there are any; a worded range ("Middle–High School") falls back to its words.
 */
export function ageKey(text: string | null | undefined): string {
  if (!text?.trim()) return ''
  const numbers = text.match(/\d{1,2}/g)
  if (numbers?.length) return numbers.join('-')
  return text
    .toLowerCase()
    .replace(/\b(ages?|grade|grades)\b/g, '')
    .replace(/[^a-z]+/g, ' ')
    .trim()
}

/** Every class on the schedule, in the order staff listed them. */
export function allClasses(config: RegistrationConfig): ClassSlot[] {
  const classes: ClassSlot[] = []

  for (const entry of config.sports) {
    const sport = entry.sport.trim().toLowerCase()
    // Staff can name a schedule block anything; only the two sports the rest of
    // the app knows about can scope a roster. Same rule as `sportsByWeekday`.
    if (!isSport(sport)) continue

    for (const slot of entry.slots) {
      const key = classKeyFor(sport, slot.time)
      if (classes.some(c => c.key === key)) continue
      classes.push({
        key,
        sport,
        time: slot.time,
        ages: slot.ages,
        label: `${SPORT_LABELS[sport]} · ${slot.time}`,
        weekdays: weekdaysIn(slot.time),
        startMinutes: startMinutesIn(slot.time),
      })
    }
  }

  return classes
}

/**
 * The classes that run on a date, as `yyyy-mm-dd`.
 *
 * Empty means nothing is on the calendar that day — a make-up, or a schedule
 * staff have not filled in. The caller falls back to one whole-day session
 * rather than refusing to record anything.
 */
export function classesOnDate(config: RegistrationConfig, date: string): ClassSlot[] {
  // Noon UTC, same reason as lib/dates.ts: parsing a bare date in a negative
  // offset lands on the previous day, which would read Saturday as Friday.
  const weekday = new Date(date + 'T12:00:00Z').getUTCDay()
  return allClasses(config).filter(c => c.weekdays.includes(weekday))
}

/**
 * Which of `classes` a student's class label puts them in.
 *
 * Most labels answer this outright. The ones that do not are the reason this
 * returns a list rather than one class: a student who could be in either Friday
 * class is shown on both rosters and flagged, because hiding a kid who is
 * standing in the gym is the one outcome a coach cannot work around mid-session.
 *
 * Read in order, most specific first:
 *  1. The label names a day and a time that a slot also names — the spreadsheet
 *     labels ("Friday 4pm") are exactly this, and they name the class directly.
 *  2. The label names no sport we know — those students go on every roster,
 *     the same rule `sportForClassLabel` returning null has always meant.
 *  3. One class of their sport runs that day: it is that one.
 *  4. Several do, and their age range matches one of them — registration writes
 *     "Ages 5–9 Basketball", which is the only thing telling the 4PM class from
 *     the 5PM one.
 *  5. Otherwise every class of their sport, flagged as unplaced.
 */
export function classKeysForLabel(
  label: string | null | undefined,
  classes: ClassSlot[],
): string[] {
  if (classes.length === 0) return []

  const start = startMinutesIn(label ?? '')
  if (start !== null) {
    const days = weekdaysIn(label ?? '')
    const byTime = classes.filter(
      c =>
        c.startMinutes === start &&
        (days.length === 0 || c.weekdays.some(d => days.includes(d))),
    )
    if (byTime.length) return byTime.map(c => c.key)
  }

  const sport = sportForClassLabel(label)
  if (!sport) return classes.map(c => c.key)

  const sameSport = classes.filter(c => c.sport === sport)
  if (sameSport.length <= 1) return sameSport.map(c => c.key)

  const age = ageKey(label)
  if (age) {
    const byAge = sameSport.filter(c => ageKey(c.ages) === age)
    if (byAge.length) return byAge.map(c => c.key)
  }

  return sameSport.map(c => c.key)
}
