'use client'

import { useState, useEffect } from 'react'

const CATEGORIES = ['Gym / Facility', 'Equipment', 'Uniforms', 'Marketing', 'Miscellaneous']

interface Expense {
  id: string
  description: string
  category: string
  amount: string
  date: string
  createdAt: string
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ description: '', category: CATEGORIES[0], amount: '', date: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/expenses')
    if (res.ok) setExpenses(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setForm({ description: '', category: CATEGORIES[0], amount: '', date: '' })
      setShowForm(false)
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Failed to save')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense?')) return
    await fetch('/api/expenses', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0)

  const byCategory = CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = expenses.filter(e => e.category === cat).reduce((s, e) => s + parseFloat(e.amount), 0)
    return acc
  }, {})

  const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/40 bg-white'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-condensed font-bold text-2xl text-brand-navy tracking-wide">Expenses</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track gym rent, equipment, and other costs</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="bg-brand-navy text-white px-4 py-2.5 rounded-full text-sm font-semibold hover:bg-brand-navy/90 active:scale-95 transition-all"
        >
          + Add Expense
        </button>
      </div>

      {/* Add expense form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5">
          <h2 className="font-semibold text-brand-navy mb-4">New Expense</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description <span className="text-brand-orange">*</span></label>
                <input
                  required type="text" placeholder="e.g. March gym rental"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category <span className="text-brand-orange">*</span></label>
                <select
                  value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className={inputCls}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount ($) <span className="text-brand-orange">*</span></label>
                <input
                  required type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date <span className="text-brand-orange">*</span></label>
                <input
                  required type="date"
                  value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-full border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-full bg-brand-teal text-white text-sm font-semibold hover:bg-brand-teal/90 disabled:opacity-50 transition-all">
                {saving ? 'Saving…' : 'Save Expense'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Expenses</p>
          <p className="font-condensed font-bold text-3xl text-brand-orange mt-1">${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gym / Facility</p>
          <p className="font-condensed font-bold text-3xl text-brand-navy mt-1">${(byCategory['Gym / Facility'] ?? 0).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Equipment</p>
          <p className="font-condensed font-bold text-3xl text-brand-teal mt-1">${(byCategory['Equipment'] ?? 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Expense list */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Expense History</h2>
          <p className="text-xs text-gray-400 mt-0.5">{expenses.length} records</p>
        </div>
        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">Loading…</div>
        ) : expenses.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">No expenses recorded yet. Click + Add Expense to start.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F4F2EE]">
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Description</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Category</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Amount</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-[#F4F2EE]/60 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{exp.description}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-brand-orange">
                      ${parseFloat(exp.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
