'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Member = { id: string; firstName: string; lastName: string; teamAssignment: string | null }

const AVATAR_COLORS = [
  'bg-brand-navy', 'bg-brand-teal', 'bg-purple-600', 'bg-blue-600',
  'bg-indigo-600', 'bg-emerald-600',
]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export default function TakeAttendance({ date, members }: { date: string; members: Member[] }) {
  const router = useRouter()
  const [present, setPresent] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

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
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        presentIds: Array.from(present),
        allMemberIds: members.map(m => m.id),
      }),
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

  const presentCount = present.size

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{presentCount}</span> / {members.length} present
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

      {/* Quick-select */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setPresent(new Set(members.map(m => m.id))); setSaved(false) }}
          className="text-xs text-gray-400 hover:text-brand-teal transition-colors"
        >
          Mark all present
        </button>
        <span className="text-gray-200">·</span>
        <button
          type="button"
          onClick={() => { setPresent(new Set()); setSaved(false) }}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* Member list */}
      <div className="space-y-2">
        {members.map(m => {
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
                {m.teamAssignment && (
                  <p className="text-xs text-gray-400 mt-0.5">{m.teamAssignment}</p>
                )}
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

      {members.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">No active members found.</p>
      )}
    </div>
  )
}
