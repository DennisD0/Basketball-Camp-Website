'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { avatarColor } from '@/lib/avatar'
import { ALL_CLASSES_KEY, LEGACY_CLASS_KEY } from '@/lib/classes'
import type { Sport } from '@/lib/sports'

type Member = {
  id: string
  firstName: string
  lastName: string
  teamAssignment: string | null
  /** Read from the class label. Null when it names both sports or neither. */
  sport: Sport | null
  /** Which of today's classes this student belongs to. See lib/classes.ts. */
  classKeys: string[]
}

/** A class on the schedule for this date. */
type ClassOption = { key: string; label: string; time: string; ages: string }

/** What is already saved for a class, so the sheet opens on it. */
type Saved = { present: string[]; recorded: string[] }

/**
 * The session row a tab writes to. The "All students" tab keeps the whole-day
 * row — the empty key — because that is exactly what it records, and what every
 * session taken before classes existed already sits under.
 */
function sessionKeyFor(tab: string): string {
  return tab === ALL_CLASSES_KEY ? LEGACY_CLASS_KEY : tab
}

/** "Tuesday" from a yyyy-mm-dd — noon UTC so the day never slips backwards. */
function weekdayName(date: string): string {
  return new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long' })
}

export default function TakeAttendance({
  date,
  members,
  classes,
  saved,
}: {
  date: string
  members: Member[]
  /** Classes that run on this weekday, from the registration form's schedule. */
  classes: ClassOption[]
  /** Keyed by class key; the whole-day session lives under the empty string. */
  saved: Record<string, Saved>
}) {
  const router = useRouter()

  // Attendance belongs to a class, not to a day. Two classes run on a Friday,
  // and while they shared one record saving the second wiped the first: nobody
  // from the 4PM class was ticked on the 5PM screen, so all of them were written
  // back as absent. Each tab is now its own session row.
  const [selected, setSelected] = useState<string>(classes[0]?.key ?? ALL_CLASSES_KEY)

  /**
   * Ticks per class, seeded from what is already on the record.
   *
   * Seeding is the other half of the same bug: the sheet used to open empty, so
   * re-opening a class just to correct one student re-wrote everyone else to
   * absent. Kept per class so switching tabs mid-session never drops unsaved work.
   */
  const [ticks, setTicks] = useState<Record<string, Set<string>>>(() => {
    const seeded: Record<string, Set<string>> = {}
    for (const tab of [...classes.map(c => c.key), ALL_CLASSES_KEY]) {
      const onRecord = saved[sessionKeyFor(tab)]
      if (onRecord) seeded[tab] = new Set(onRecord.present)
    }
    return seeded
  })
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const present = ticks[selected] ?? new Set<string>()
  const isSavedNow = savedKeys.has(selected)

  // 'all' keeps every student on the list, for a make-up or a joint session, and
  // records one whole-day session — which is what the empty class key has always
  // meant. A student whose label names no sport we can read is on every roster,
  // flagged: hiding a kid standing in the gym is the one thing a coach cannot
  // work around mid-session.
  const visible = useMemo(
    () => (selected === ALL_CLASSES_KEY ? members : members.filter(m => m.classKeys.includes(selected))),
    [members, selected],
  )
  const countFor = (key: string) =>
    key === ALL_CLASSES_KEY ? members.length : members.filter(m => m.classKeys.includes(key)).length

  function update(fn: (prev: Set<string>) => Set<string>) {
    setTicks(prev => ({ ...prev, [selected]: fn(prev[selected] ?? new Set()) }))
    setSavedKeys(prev => {
      const next = new Set(prev)
      next.delete(selected)
      return next
    })
  }

  function toggle(id: string) {
    update(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function save() {
    setSaving(true)
    setError('')

    const selectedClass = classes.find(c => c.key === selected)
    // Only the students on this class's roster are recorded — an absence is a
    // claim that the student was expected, and a 5PM student is not absent from
    // the 4PM class. Anyone ticked anyway is kept, so a check-in a coach made
    // deliberately is never dropped.
    const presentIds = Array.from(present)
    const allMemberIds = Array.from(new Set([...visible.map(m => m.id), ...presentIds]))

    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        classKey: sessionKeyFor(selected),
        classLabel: selectedClass?.label ?? null,
        presentIds,
        allMemberIds,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setSavedKeys(prev => new Set([...prev, selected]))
      // Refresh server data so View tab reflects the save
      router.refresh()
    } else {
      setError('Failed to save — please try again.')
    }
  }

  const presentCount = visible.filter(m => present.has(m.id)).length
  const selectedClass = classes.find(c => c.key === selected)
  const alreadyOnRecord = (saved[sessionKeyFor(selected)]?.recorded.length ?? 0) > 0

  const tabs: ClassOption[] = [
    ...classes,
    { key: ALL_CLASSES_KEY, label: 'All students', time: '', ages: '' },
  ]

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{presentCount}</span> / {visible.length} present
        </p>
        <div className="flex items-center gap-3">
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={save}
            disabled={saving}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              isSavedNow
                ? 'bg-green-50 text-green-700'
                : 'bg-brand-navy text-white hover:bg-brand-navy/90 active:scale-95'
            } disabled:opacity-50`}
          >
            {saving ? 'Saving…' : isSavedNow ? '✓ Saved' : 'Save Attendance'}
          </button>
        </div>
      </div>

      {/* Which class. Each one is saved on its own, so taking the 5PM register
          cannot touch what the 4PM register already recorded. */}
      <div className="space-y-1.5">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
          {tabs.map(c => (
            <button
              key={c.key}
              type="button"
              onClick={() => setSelected(c.key)}
              className={`flex-1 min-w-[112px] min-h-[44px] px-2 text-xs font-semibold rounded-lg transition-all ${
                selected === c.key ? 'bg-white text-brand-navy shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="block truncate">{c.key === ALL_CLASSES_KEY ? c.label : c.time}</span>
              <span className={`block text-[10px] font-normal truncate ${selected === c.key ? 'text-gray-400' : 'text-gray-300'}`}>
                {c.key === ALL_CLASSES_KEY ? `${countFor(c.key)} students` : `${c.ages} · ${countFor(c.key)}`}
              </span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400">
          {selected === ALL_CLASSES_KEY ? (
            classes.length === 0
              ? `No class is scheduled on a ${weekdayName(date)}, so everyone is listed and this saves as one session for the whole day.`
              : 'Everyone is listed. This saves as one session for the whole day, not against a class.'
          ) : (
            <>
              Taking the register for <span className="font-semibold text-gray-500">{selectedClass?.label}</span>
              {alreadyOnRecord ? ' — already recorded, showing what was saved.' : ' only. Other classes today are unaffected.'}
            </>
          )}
        </p>
      </div>

      {/* Quick-select */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => update(() => new Set(visible.map(m => m.id)))}
          className="text-xs text-gray-400 hover:text-brand-teal transition-colors"
        >
          Mark all present
        </button>
        <span className="text-gray-200">·</span>
        <button
          type="button"
          onClick={() => update(prev => new Set([...prev].filter(id => !visible.some(m => m.id === id))))}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* Member list */}
      <div className="space-y-2">
        {visible.map(m => {
          const isPresent = present.has(m.id)
          const initials = `${m.firstName[0] ?? ''}${m.lastName?.[0] ?? ''}`.toUpperCase()
          const bg = avatarColor(m.firstName + m.lastName)
          // Their label did not say which of today's classes they are in, so
          // they are on more than one roster rather than missing from the right one.
          const unplaced = selected !== ALL_CLASSES_KEY && m.classKeys.length > 1

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                isPresent
                  ? 'border-brand-teal bg-brand-teal/5'
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-xl ${isPresent ? 'bg-brand-teal' : bg} flex items-center justify-center text-sm font-bold text-white flex-shrink-0 transition-colors`}>
                {initials}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${isPresent ? 'text-brand-teal' : 'text-gray-900'}`}>
                  {m.firstName} {m.lastName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {m.teamAssignment && (
                    <p className="text-xs text-gray-400">{m.teamAssignment}</p>
                  )}
                  {m.sport === null && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                      sport not set
                    </span>
                  )}
                  {unplaced && m.sport !== null && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                      class not set
                    </span>
                  )}
                </div>
              </div>

              {/* Status pill */}
              <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 transition-all ${
                isPresent ? 'bg-brand-teal text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {isPresent ? 'Present' : 'Absent'}
              </span>
            </button>
          )
        })}
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">
          {members.length === 0
            ? 'No active members found.'
            : `No students are on the ${selectedClass?.label ?? 'this'} roster. Switch to All students to see everyone.`}
        </p>
      )}
    </div>
  )
}
