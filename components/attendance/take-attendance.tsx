'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { avatarColor } from '@/lib/avatar'
import { SPORTS, SPORT_LABELS, type Sport } from '@/lib/sports'

type Member = {
  id: string
  firstName: string
  lastName: string
  teamAssignment: string | null
  /** Read from the class label. Null when it names both sports or neither. */
  sport: Sport | null
}

/** 'all' keeps every student on the list, for a make-up or a joint session. */
type Filter = Sport | 'all'

/** "Tuesday" from a yyyy-mm-dd — noon UTC so the day never slips backwards. */
function weekdayName(date: string): string {
  return new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long' })
}

export default function TakeAttendance({
  date,
  members,
  scheduledSports = [],
}: {
  date: string
  members: Member[]
  /** Sports that train on this weekday, from the registration form's schedule. */
  scheduledSports?: Sport[]
}) {
  const router = useRouter()
  const [present, setPresent] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // One sport on the calendar today: open on that roster. Two sports, or none
  // (a day with no class on the schedule), and there is nothing to narrow to.
  const [filter, setFilter] = useState<Filter>(
    scheduledSports.length === 1 ? scheduledSports[0] : 'all',
  )

  // A student whose class label does not name a sport is shown on every roster,
  // flagged. Hiding them would mean a coach silently cannot check in a kid who
  // is standing in the gym, and the fix — editing the class label — is not
  // something to discover mid-session.
  const visible = useMemo(
    () => (filter === 'all' ? members : members.filter(m => m.sport === filter || m.sport === null)),
    [members, filter],
  )
  const countFor = (f: Filter) =>
    f === 'all' ? members.length : members.filter(m => m.sport === f || m.sport === null).length

  function toggle(id: string) {
    setPresent(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError('')
    // Only the students on screen are recorded — an absence is a claim that the
    // student was expected, and a volleyball player is not absent from a
    // basketball practice. Anyone ticked before the filter changed is kept, so a
    // check-in can never be dropped by switching rosters.
    const presentIds = Array.from(present)
    const allMemberIds = Array.from(new Set([...visible.map(m => m.id), ...presentIds]))

    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, presentIds, allMemberIds }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      // Refresh server data so View tab reflects the save
      router.refresh()
    } else {
      setError('Failed to save — please try again.')
    }
  }

  const presentCount = visible.filter(m => present.has(m.id)).length

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
              saved
                ? 'bg-green-50 text-green-700'
                : 'bg-brand-navy text-white hover:bg-brand-navy/90 active:scale-95'
            } disabled:opacity-50`}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Attendance'}
          </button>
        </div>
      </div>

      {/* Roster scope — basketball on Tue/Fri, volleyball on Sat, per the
          schedule on the registration form. Switchable for make-up sessions. */}
      <div className="space-y-1.5">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {([...SPORTS, 'all'] as Filter[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`flex-1 min-h-[40px] text-xs font-semibold rounded-lg transition-all ${
                filter === f ? 'bg-white text-brand-navy shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {f === 'all' ? 'All students' : SPORT_LABELS[f]}
              <span className={`ml-1.5 ${filter === f ? 'text-gray-400' : 'text-gray-300'}`}>{countFor(f)}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400">
          {scheduledSports.length === 1
            ? `${weekdayName(date)} is ${SPORT_LABELS[scheduledSports[0]].toLowerCase()} — ${
                filter === scheduledSports[0]
                  ? 'other students are hidden.'
                  : 'showing a different roster than the schedule.'
              }`
            : scheduledSports.length > 1
            ? `${weekdayName(date)} has ${scheduledSports.map(sp => SPORT_LABELS[sp].toLowerCase()).join(' and ')} on the schedule.`
            : `No class is scheduled on a ${weekdayName(date)}, so everyone is listed.`}
        </p>
      </div>

      {/* Quick-select */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setPresent(new Set(visible.map(m => m.id))); setSaved(false) }}
          className="text-xs text-gray-400 hover:text-brand-teal transition-colors"
        >
          Mark all present
        </button>
        <span className="text-gray-200">·</span>
        <button
          type="button"
          onClick={() => { setPresent(prev => new Set([...prev].filter(id => !visible.some(m => m.id === id)))); setSaved(false) }}
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
                  {m.sport === null && filter !== 'all' && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                      sport not set
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
            : `No ${filter === 'all' ? '' : SPORT_LABELS[filter as Sport].toLowerCase() + ' '}students on the roster. Switch to All students to see everyone.`}
        </p>
      )}
    </div>
  )
}
