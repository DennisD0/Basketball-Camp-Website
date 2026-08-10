'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SPORTS, SPORT_LABELS, guessSportFromTeam } from '@/lib/sports'

type Member = { id: string; firstName: string; lastName: string; teamAssignment: string | null }

export default function PaymentForm({ members }: { members: Member[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    memberId: '',
    amount: '',
    method: 'CASH',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    sport: '',
  })
  // True when the sport below was filled in from the member's class label
  // rather than chosen. Shown, not hidden: a student can be enrolled in both
  // sports, so the guess is a starting point staff confirm.
  const [sportGuessed, setSportGuessed] = useState(false)

  function selectMember(memberId: string) {
    const member = members.find(m => m.id === memberId)
    const guess = guessSportFromTeam(member?.teamAssignment)
    setSportGuessed(Boolean(guess))
    setForm(f => ({ ...f, memberId, sport: guess ?? '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/finances/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Something went wrong')
      setLoading(false)
      return
    }

    router.push('/finances')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-black/5 max-w-lg">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Member</label>
          <select
            required
            value={form.memberId}
            onChange={e => selectMember(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/40 bg-white"
          >
            <option value="">Select member…</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName} {m.teamAssignment ? `(${m.teamAssignment})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Sport</label>
          <div className="grid grid-cols-2 gap-2">
            {SPORTS.map(s => {
              const selected = form.sport === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSportGuessed(false); setForm(f => ({ ...f, sport: s })) }}
                  className={`min-h-[40px] px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                    selected
                      ? 'bg-brand-teal text-white border-brand-teal'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {SPORT_LABELS[s]}
                </button>
              )
            })}
          </div>
          {sportGuessed && (
            <p className="mt-1.5 text-xs text-gray-500">
              Filled in from this member&apos;s class. Change it if this payment was for the other sport.
            </p>
          )}
          {!form.sport && form.memberId && (
            <p className="mt-1.5 text-xs text-brand-orange">
              Pick a sport — this payment can&apos;t be counted towards either program without one.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount ($)</label>
            <input
              type="number"
              required
              min="1"
              step="0.01"
              placeholder="50"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Method</label>
            <select
              value={form.method}
              onChange={e => setForm(f => ({ ...f, method: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/40 bg-white"
            >
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Date</label>
          <input
            type="date"
            required
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/40"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
          <input
            type="text"
            placeholder="e.g. November monthly fee"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/40"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={loading || !form.sport}
            className="flex-1 bg-brand-teal text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-brand-teal/90 transition-all disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Record Payment'}
          </button>
          <a
            href="/finances"
            className="px-5 py-2.5 rounded-full text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
          >
            Cancel
          </a>
        </div>
      </div>
    </form>
  )
}
