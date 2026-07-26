'use client'

import { useState, useEffect } from 'react'

interface Trial {
  id: string
  name: string
  classTime: string | null
  guardianName: string | null
  guardianPhone: string | null
  email: string | null
  age: number | null
  packageInterest: string | null
  classPref: string | null
  notes: string | null
  converted: boolean
  createdAt: string
}

export default function TrialsPage() {
  const [trials, setTrials] = useState<Trial[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'converted'>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', classTime: '', guardianName: '', guardianPhone: '', email: '', age: '', packageInterest: '', notes: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/trials')
    if (res.ok) setTrials(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleConverted(t: Trial) {
    await fetch(`/api/trials/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ converted: !t.converted }),
    })
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this trial record?')) return
    await fetch('/api/trials', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/trials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, age: form.age ? parseInt(form.age) : undefined }),
    })
    setSaving(false)
    if (res.ok) {
      setForm({ name: '', classTime: '', guardianName: '', guardianPhone: '', email: '', age: '', packageInterest: '', notes: '' })
      setShowForm(false)
      load()
    }
  }

  const filtered = trials.filter(t =>
    filter === 'all' ? true :
    filter === 'converted' ? t.converted :
    !t.converted
  )

  const counts = {
    all: trials.length,
    pending: trials.filter(t => !t.converted).length,
    converted: trials.filter(t => t.converted).length,
  }

  const inp = 'w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/40 bg-white'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-condensed font-bold text-2xl text-brand-navy tracking-wide">Trial Sessions</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track prospective students and mark them as converted</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="bg-brand-teal text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-brand-teal/90 transition-all active:scale-95"
        >
          + Add Trial
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {(['all', 'pending', 'converted'] as const).map(k => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`bg-white rounded-2xl p-5 shadow-sm ring-1 text-left transition-all ${
              filter === k ? 'ring-brand-teal' : 'ring-black/5 hover:ring-black/10'
            }`}
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {k === 'all' ? 'Total' : k === 'pending' ? 'Pending' : 'Converted'}
            </p>
            <p className={`font-condensed font-bold text-3xl mt-1 ${
              k === 'converted' ? 'text-brand-teal' :
              k === 'pending' ? 'text-brand-orange' : 'text-brand-navy'
            }`}>
              {counts[k]}
            </p>
          </button>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5">
          <p className="font-semibold text-gray-800 mb-4">Add Trial Student</p>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-3">
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Name *</label>
                <input className={inp} required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Class / Time</label>
                <input className={inp} value={form.classTime} onChange={e => setForm(f => ({ ...f, classTime: e.target.value }))} placeholder="e.g. 5pm Fri" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Guardian Name</label>
              <input className={inp} value={form.guardianName} onChange={e => setForm(f => ({ ...f, guardianName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Guardian Phone</label>
              <input className={inp} value={form.guardianPhone} onChange={e => setForm(f => ({ ...f, guardianPhone: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
              <input className={inp} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Age</label>
              <input className={inp} type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Package Interest</label>
              <input className={inp} value={form.packageInterest} onChange={e => setForm(f => ({ ...f, packageInterest: e.target.value }))} placeholder="e.g. Silver, 7 sessions" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
              <input className={inp} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="col-span-2 flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-brand-navy text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-brand-navy/90 transition-all active:scale-95">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all active:scale-95">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-800 text-sm">{filtered.length} {filter === 'all' ? 'total' : filter} trial{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No trial students yet. Import from the Import page or add one above.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(t => (
              <div key={t.id} className={`px-5 py-4 flex items-start gap-4 ${t.converted ? 'bg-green-50/40' : ''}`}>
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  t.converted ? 'bg-brand-teal/15 text-brand-teal' : 'bg-brand-navy/10 text-brand-navy'
                }`}>
                  {t.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    {t.age && <span className="text-xs text-gray-400">Age {t.age}</span>}
                    {t.classTime && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-navy/8 text-brand-navy font-medium">{t.classTime}</span>
                    )}
                    {t.converted && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Converted ✓</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {t.guardianName && <p className="text-xs text-gray-500">Parent: <span className="font-medium text-gray-700">{t.guardianName}</span></p>}
                    {t.guardianPhone && <p className="text-xs text-gray-500">{t.guardianPhone}</p>}
                    {t.email && <p className="text-xs text-gray-400">{t.email}</p>}
                  </div>
                  <div className="flex gap-3 mt-1 flex-wrap">
                    {t.packageInterest && <p className="text-xs text-brand-teal font-medium">Interested: {t.packageInterest}</p>}
                    {t.classPref && <p className="text-xs text-gray-400">Pref: {t.classPref}</p>}
                    {t.notes && <p className="text-xs text-gray-400 italic">{t.notes}</p>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleConverted(t)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all active:scale-95 ${
                      t.converted
                        ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {t.converted ? 'Undo' : '✓ Converted'}
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="text-xs text-gray-300 hover:text-red-400 transition-colors p-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
