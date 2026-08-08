'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PACKAGE_PRESETS as PRESETS, DEFAULT_PRESET, todayISO } from '@/lib/package-presets'

export default function NewPackageButton({
  memberId,
  playerName,
  currentTotal,
  urgent,
  checkInDates,
}: {
  memberId: string
  playerName: string
  currentTotal: number
  urgent: boolean
  /** yyyy-mm-dd of every PRESENT check-in, used to warn about the start-date overlap. */
  checkInDates: string[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [preset, setPreset] = useState(() => PRESETS.find(p => p.sessions === currentTotal) ?? DEFAULT_PRESET)
  const [custom, setCustom] = useState('')
  const [startDate, setStartDate] = useState(todayISO)

  const sessionsTotal = custom.trim() ? parseInt(custom, 10) : preset.sessions
  const valid = Number.isInteger(sessionsTotal) && sessionsTotal >= 1 && sessionsTotal <= 100

  // A check-in on the start date counts toward the NEW package. That is right
  // when the parent renewed before class, and wrong when the student used their
  // last old session that day — only the coach knows which, so surface it.
  const overlaps = checkInDates.includes(startDate)
  const dayAfter = (() => {
    const d = new Date(startDate + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + 1)
    return d.toISOString().slice(0, 10)
  })()

  async function submit() {
    if (!valid) return
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/members/${memberId}/packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionsTotal,
        packageType: custom.trim() ? null : preset.type,
        startDate,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => null)
      setError(j?.error ?? 'Could not start the package. Please try again.')
      setSaving(false)
      return
    }
    setOpen(false)
    setSaving(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`mt-3 w-full min-h-[40px] rounded-xl text-xs font-semibold transition-all active:scale-95 ${
          urgent
            ? 'bg-brand-teal text-white hover:bg-brand-teal/90'
            : 'border border-gray-200 text-gray-600 hover:bg-white/60'
        }`}
      >
        + New package
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !saving && setOpen(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="font-condensed font-bold text-xl text-brand-navy mb-1">Start a new package</h2>
            <p className="text-sm text-gray-500 mb-5">
              Resets {playerName}&apos;s session count. Check-ins from the start date onward
              count toward the new package; past attendance is kept but no longer charged.
            </p>

            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Package</label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {PRESETS.map(p => {
                const active = !custom.trim() && preset.label === p.label
                return (
                  <button
                    key={p.label}
                    onClick={() => { setPreset(p); setCustom('') }}
                    className={`min-h-[56px] rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
                      active
                        ? 'border-brand-teal bg-brand-teal/10 text-brand-teal'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>

            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Or a custom number of sessions
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={custom}
              onChange={e => setCustom(e.target.value)}
              placeholder="e.g. 10"
              className="w-full min-h-[44px] px-3 rounded-xl border border-gray-200 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            />

            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-gray-200 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            />
            <p className="text-[11px] text-gray-400 mb-3">
              Backdate this if the student already started the package before it was entered.
            </p>

            {overlaps && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-4">
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  <span className="font-semibold">{playerName} already has a check-in on this date.</span>{' '}
                  It will count toward the new package. If that session belonged to their
                  previous package, start this one on {dayAfter} instead.
                </p>
                <button
                  onClick={() => setStartDate(dayAfter)}
                  className="mt-2 text-[11px] font-semibold text-amber-900 underline underline-offset-2"
                >
                  Start {dayAfter} instead
                </button>
              </div>
            )}

            {error && <p className="text-xs font-semibold text-red-500 mb-3">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={saving}
                className="flex-1 min-h-[48px] rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving || !valid}
                className="flex-1 min-h-[48px] rounded-2xl bg-brand-teal text-white text-sm font-semibold hover:bg-brand-teal/90 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? 'Starting…' : `Start ${valid ? sessionsTotal : '—'} sessions`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
