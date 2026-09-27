'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Row = {
  memberId: string
  name: string
  team: string | null
  status: string
  keeper: { id: string; name: string; team: string | null } | null
  payments: { count: number; total: number }
  checkIns: number
  sessionsRemaining: number
  safe: boolean
}

type Preview = {
  rows: Row[]
  totals: { members: number; withKeeper: number; unsafe: number; payments: number; checkIns: number }
}

function money(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

/**
 * Remove the duplicate profiles the spreadsheets left behind.
 *
 * A student who came in through the Student & Packages sheet and then through
 * the registration form is on the roster twice, and the sheet copy — the one
 * labelled "Friday 4pm" rather than by age and sport — is the stale one.
 *
 * It previews before it writes, like the session reset does, and for a stronger
 * reason: this deletes profiles. Payments and check-ins move to the surviving
 * profile rather than going with the one being deleted, so finance totals do
 * not move — and a row with money on it and no surviving profile to move it to
 * is called out and left unticked.
 */
export default function CleanupSheetImportsButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'saving' | 'error'>('idle')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function load() {
    setOpen(true)
    setPreview(null)
    setSelected(new Set())
    setError('')
    setStatus('loading')
    try {
      const res = await fetch('/api/members/cleanup-sheet-imports')
      if (!res.ok) { setStatus('error'); setError('Could not read the roster.'); return }
      const data: Preview = await res.json()
      setPreview(data)
      // Only the rows that cost nothing start ticked. A profile holding the only
      // record of a payment has to be ticked deliberately.
      setSelected(new Set(data.rows.filter(r => r.safe).map(r => r.memberId)))
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
      const res = await fetch('/api/members/cleanup-sheet-imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberIds: Array.from(selected) }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        setStatus('error')
        setError(j?.error ?? 'The cleanup did not go through. Nothing was deleted.')
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
  const chosen = preview?.rows.filter(r => selected.has(r.memberId)) ?? []
  const movingPayments = chosen.filter(r => r.keeper).reduce((s, r) => s + r.payments.count, 0)
  const losingPayments = chosen.filter(r => !r.keeper).reduce((s, r) => s + r.payments.count, 0)
  const losingAmount = chosen.filter(r => !r.keeper).reduce((s, r) => s + r.payments.total, 0)

  return (
    <>
      <button
        onClick={load}
        className="text-sm font-medium text-gray-500 hover:text-brand-navy border border-gray-200 px-4 py-2 rounded-full hover:bg-gray-50 active:scale-95 transition-all"
      >
        Clean up duplicates
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !busy && setOpen(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="p-6 pb-4 flex-shrink-0">
              <h2 className="font-condensed font-bold text-xl text-brand-navy mb-1">Clean up old registrations</h2>
              <p className="text-sm text-gray-500">
                These profiles came from the old spreadsheet, which labels a student by
                when their class ran rather than by age and sport. Payments and check-ins
                move to the student&apos;s current profile — they are not deleted with it.
              </p>
            </div>

            <div className="px-6 flex-1 overflow-y-auto">
              {status === 'loading' && (
                <p className="text-sm text-gray-400 py-8 text-center">Reading the roster…</p>
              )}

              {preview && (
                <>
                  <div className="rounded-2xl bg-[#F4F2EE] p-4 mb-4">
                    <p className="text-sm text-gray-700">
                      <strong>{chosen.length}</strong> of {preview.rows.length} old profile{preview.rows.length === 1 ? '' : 's'} will be deleted.
                    </p>
                    {movingPayments > 0 && (
                      <p className="text-xs text-gray-500 mt-1.5">
                        {movingPayments} payment{movingPayments === 1 ? '' : 's'} and their check-ins
                        move to the matching profile, so finance totals do not change.
                      </p>
                    )}
                    {losingPayments > 0 && (
                      <p className="text-xs text-red-600 mt-1.5 font-medium">
                        {losingPayments} payment{losingPayments === 1 ? '' : 's'} worth {money(losingAmount)} have
                        no matching profile to move to and would be deleted with these rows.
                      </p>
                    )}
                  </div>

                  {preview.rows.length > 0 && (
                    <div className="flex gap-3 mb-1 text-xs">
                      <button type="button" onClick={() => setSelected(new Set(preview.rows.map(r => r.memberId)))} className="text-gray-400 hover:text-brand-teal">
                        Select all
                      </button>
                      <span className="text-gray-200">·</span>
                      <button type="button" onClick={() => setSelected(new Set(preview.rows.filter(r => r.safe).map(r => r.memberId)))} className="text-gray-400 hover:text-brand-teal">
                        Only safe
                      </button>
                      <span className="text-gray-200">·</span>
                      <button type="button" onClick={() => setSelected(new Set())} className="text-gray-400 hover:text-red-500">
                        Select none
                      </button>
                    </div>
                  )}

                  <div className="space-y-1 mb-2">
                    {preview.rows.map(r => {
                      const on = selected.has(r.memberId)
                      return (
                        <label key={r.memberId} className={`flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 cursor-pointer ${on ? '' : 'opacity-50'}`}>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggle(r.memberId)}
                            disabled={busy}
                            className="h-5 w-5 flex-shrink-0 accent-brand-teal"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {r.name}
                              <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">{r.team}</span>
                            </p>
                            <p className="text-[11px] truncate">
                              {r.keeper ? (
                                <span className="text-brand-teal">
                                  → merges into {r.keeper.team ?? r.keeper.name}
                                </span>
                              ) : r.safe ? (
                                <span className="text-gray-400">no payments or check-ins to keep</span>
                              ) : (
                                <span className="text-red-600 font-medium">
                                  no matching profile · {r.payments.count} payment{r.payments.count === 1 ? '' : 's'} ({money(r.payments.total)}) would be deleted
                                </span>
                              )}
                            </p>
                          </div>
                          <p className="text-[11px] text-gray-400 whitespace-nowrap">
                            {r.checkIns} check-in{r.checkIns === 1 ? '' : 's'}
                          </p>
                        </label>
                      )
                    })}
                    {preview.rows.length === 0 && (
                      <p className="text-sm text-gray-400 py-6 text-center">
                        No spreadsheet profiles left — the roster is already clean.
                      </p>
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
                disabled={busy || !preview || chosen.length === 0}
                className="flex-1 min-h-[48px] rounded-2xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50"
              >
                {busy ? 'Deleting…' : `Delete ${chosen.length} profile${chosen.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
