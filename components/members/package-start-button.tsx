'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { asLocalDate } from '@/lib/dates'

function shortDate(iso: string): string {
  return asLocalDate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Correct the day a student's package started.
 *
 * The case this exists for: a parent pays late, owes a class from before, and
 * registers afterwards. The class they attended is real and belongs to the
 * package they just bought — but it falls before the window, so it counts
 * toward nothing and the student is left a session to the good.
 *
 * When that has happened the card already knows: it hands us the earliest
 * check-in no package covers, and the fix is one tap on it. Typing a date is
 * still there for everything else.
 */
export default function PackageStartButton({
  memberId,
  playerName,
  startDate,
  /** yyyy-mm-dd of PRESENT check-ins that fall before the window, oldest first. */
  uncountedDates,
}: {
  memberId: string
  playerName: string
  /** ISO date the package currently starts. */
  startDate: string
  uncountedDates: string[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(startDate.slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const earliest = uncountedDates[0] ?? null

  async function submit(date: string) {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/members/${memberId}/packages`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: date }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => null)
      setError(j?.error ?? 'Could not change the start date. Please try again.')
      setSaving(false)
      return
    }
    setOpen(false)
    setSaving(false)
    router.refresh()
  }

  return (
    <>
      {/* The nudge only appears when there is actually something uncounted, so
          a correctly-dated package carries no clutter. */}
      {earliest && (
        <button
          onClick={() => { setValue(earliest); setOpen(true) }}
          className="w-full text-left mt-2 rounded-xl bg-amber-50 px-3 py-2 hover:bg-amber-100 transition-colors"
        >
          <p className="text-[11px] font-semibold text-amber-800">
            {uncountedDates.length} earlier check-in{uncountedDates.length === 1 ? '' : 's'} not counted
          </p>
          <p className="text-[11px] text-amber-700/80 mt-0.5">
            {playerName} attended on {shortDate(earliest)}, before this package started.
            Tap to count it.
          </p>
        </button>
      )}

      <button
        onClick={() => { setValue(startDate.slice(0, 10)); setOpen(true) }}
        className="mt-2 w-full min-h-[40px] rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-white/60 transition-all active:scale-95"
      >
        Change start date
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !saving && setOpen(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="font-condensed font-bold text-xl text-brand-navy mb-1">Package start date</h2>
            <p className="text-sm text-gray-500 mb-5">
              Check-ins from this date onward count toward {playerName}&apos;s current package.
              Nothing is added or removed from their attendance — only which sessions it pays for.
            </p>

            {earliest && (
              <button
                type="button"
                onClick={() => setValue(earliest)}
                className={`w-full mb-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  value === earliest ? 'bg-brand-teal/10 ring-1 ring-brand-teal/40' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <p className="text-xs font-semibold text-gray-800">Count from {shortDate(earliest)}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Their earliest check-in that nothing is paying for
                  {uncountedDates.length > 1 ? `, and ${uncountedDates.length - 1} more after it` : ''}.
                </p>
              </button>
            )}

            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Starts on
            </label>
            <input
              type="date"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            />

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 mt-3">{error}</p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setOpen(false)}
                disabled={saving}
                className="flex-1 min-h-[48px] rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => submit(value)}
                disabled={saving || !value}
                className="flex-1 min-h-[48px] rounded-2xl bg-brand-teal text-white text-sm font-semibold hover:bg-brand-teal/90 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
