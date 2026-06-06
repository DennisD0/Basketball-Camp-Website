'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
  })

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
            onChange={e => setForm(f => ({ ...f, memberId: e.target.value }))}
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
            disabled={loading}
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
