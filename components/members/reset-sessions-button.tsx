'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { todayISO } from '@/lib/package-presets'

type Row = {
  memberId: string
  name: string
  team: string | null
  currentTotal: number
  currentUsed: number
  currentRemaining: number
  proposedTotal: number
  proposedType: string | null
  source: 'registration' | 'current package'
}

type Preview = {
  rows: Row[]
  totals: { members: number; fromSheet: number; usedCleared: number; totalChanged: number }
}

/**
 * Clear the session counts the spreadsheets left behind.
 *
 * Every student imported from the sheet arrived reading 7 of 7 used, which makes
 * the whole roster look expired. This puts each of them on a fresh package with
 * the total their registration says they bought, counting from a date staff pick.
 *
 * It previews before it writes, like the import reset does: this touches every
 * member at once, and a coach has to be able to see that a student is about to
 * go from 7 sessions to 5 before it happens, not after.
 */
export default function ResetSessionsButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'saving' | 'error'>('idle')
  const [error, setError] = useState('')
  const [startDate, setStartDate] = useState(todayISO)

  async function load() {
    setOpen(true)
    setPreview(null)
    setError('')
    setStatus('loading')
    try {
      const res = await fetch('/api/members/reset-sessions')
      if (!res.ok) { setStatus('error'); setError('Could not read the current session counts.'); return }
      setPreview(await res.json())
      setStatus('ready')
    } catch {
      setStatus('error')
      setError('Could not reach the server.')
    }
  }

  async function apply() {
    setStatus('saving')
    setError('')
    try {
      const res = await fetch('/api/members/reset-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        setStatus('error')
        setError(j?.error ?? 'The reset did not go through. Nothing else was changed.')
        return
      }
      setOpen(false)
      setStatus('idle')
      router.refresh()
    } catch {
      setStatus('error')
      setError('Could not reach the server.')
    }
  }

  const busy = status === 'saving'

  return (
    <>
      <button
        onClick={load}
        className="text-sm font-medium text-gray-500 hover:text-brand-navy border border-gray-200 px-4 py-2 rounded-full hover:bg-gray-50 active:scale-95 transition-all"
      >
        Reset sessions
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !busy && setOpen(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="p-6 pb-4 flex-shrink-0">
              <h2 className="font-condensed font-bold text-xl text-brand-navy mb-1">Reset session counts</h2>
              <p className="text-sm text-gray-500">
                Every active member starts a new package on the date below. Their attendance
                history is kept — check-ins before that date simply stop counting against
                their remaining sessions.
              </p>
            </div>

            <div className="px-6 flex-1 overflow-y-auto">
              {status === 'loading' && (
                <p className="text-sm text-gray-400 py-8 text-center">Reading current counts…</p>
              )}

              {preview && (
                <>
                  <div className="rounded-2xl bg-[#F4F2EE] p-4 mb-4">
                    <p className="text-sm text-gray-700">
                      <strong>{preview.totals.members}</strong> member{preview.totals.members === 1 ? '' : 's'} will be reset.
                      {' '}<strong>{preview.totals.usedCleared}</strong> used-session
                      {preview.totals.usedCleared === 1 ? '' : 's'} cleared.
                    </p>
                    {preview.totals.totalChanged > 0 && (
                      <p className="text-xs text-gray-500 mt-1.5">
                        {preview.totals.totalChanged} student{preview.totals.totalChanged === 1 ? '' : 's'} also
                        {' '}get{preview.totals.totalChanged === 1 ? 's' : ''} a corrected session total, taken from
                        {' '}the package they registered for.
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1.5">
                      Counts for {preview.totals.members - preview.totals.fromSheet} student
                      {preview.totals.members - preview.totals.fromSheet === 1 ? '' : 's'} could not be matched to a
                      registration, so their current total is kept as-is.
                    </p>
                  </div>

                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    New packages start on
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-gray-200 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                  />
                  <p className="text-[11px] text-gray-400 mb-4">
                    Backdate this to the start of the current term if those sessions should already count.
                  </p>

                  <div className="space-y-1 mb-2">
                    {preview.rows.map(r => {
                      const changed = r.proposedTotal !== r.currentTotal
                      return (
                        <div key={r.memberId} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{r.name}</p>
                            <p className="text-[11px] text-gray-400 truncate">
                              {r.team ?? 'No class'}
                              {r.source === 'registration' ? '' : ' · no registration on file'}
                            </p>
                          </div>
                          <p className="text-xs whitespace-nowrap">
                            <span className="text-gray-400">{r.currentUsed}/{r.currentTotal} used</span>
                            <span className="text-gray-300 mx-1.5">→</span>
                            <span className={`font-semibold ${changed ? 'text-brand-orange' : 'text-brand-teal'}`}>
                              0/{r.proposedTotal}
                            </span>
                          </p>
                        </div>
                      )
                    })}
                    {preview.rows.length === 0 && (
                      <p className="text-sm text-gray-400 py-6 text-center">No active members to reset.</p>
                    )}
                  </div>
                </>
              )}

              {error && (
                <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 my-3">{error}</p>
              )}
            </div>

            <div className="p-6 pt-4 flex gap-3 flex-shrink-0 border-t border-gray-100">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="flex-1 min-h-[48px] rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={apply}
                disabled={busy || !preview || preview.rows.length === 0}
                className="flex-1 min-h-[48px] rounded-2xl bg-brand-teal text-white text-sm font-semibold hover:bg-brand-teal/90 transition-all active:scale-95 disabled:opacity-50"
              >
                {busy ? 'Resetting…' : `Reset ${preview?.rows.length ?? ''} member${preview?.rows.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
