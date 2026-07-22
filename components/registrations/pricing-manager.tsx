'use client'

import { useState, useEffect } from 'react'

const DEFAULT_PROGRAMS = [
  { value: 'early_bird',   label: 'Early Bird',        price: '$350', sub: 'by June 6' },
  { value: 'memorial_day', label: 'Memorial Day Sale', price: '$300', sub: 'by May 31' },
  { value: 'regular',      label: 'Regular',           price: '$400', sub: 'by July 5' },
]

const STORAGE_KEY = '413-pricing-order'

export default function PricingManager() {
  const [open, setOpen] = useState(false)
  const [programs, setPrograms] = useState(DEFAULT_PROGRAMS)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const order: string[] = JSON.parse(stored)
        const sorted = [...DEFAULT_PROGRAMS].sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value))
        setPrograms(sorted)
      }
    } catch { /* ignore */ }
  }, [])

  function handleDragStart(i: number) { setDragIdx(i) }
  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === i) return
    const next = [...programs]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(i, 0, moved)
    setPrograms(next)
    setDragIdx(i)
  }
  function handleDragEnd() { setDragIdx(null) }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(programs.map(p => p.value)))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY)
    setPrograms(DEFAULT_PROGRAMS)
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
          <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
        </svg>
        Manage Pricing Order
      </button>

      {open && (
        <div className="mt-3 bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Pricing Display Order</p>
              <p className="text-xs text-gray-400 mt-0.5">Drag to reorder how options appear on the registration form</p>
            </div>
            <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Reset</button>
          </div>

          <div className="space-y-2">
            {programs.map((p, i) => (
              <div
                key={p.value}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={e => handleDragOver(e, i)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-grab active:cursor-grabbing transition-all ${
                  dragIdx === i ? 'border-brand-teal bg-brand-teal/5 shadow-sm' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-300 flex-shrink-0">
                  <circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="19" r="1" fill="currentColor"/>
                  <circle cx="15" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/>
                </svg>
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-800">{p.label}</span>
                  <span className="text-xs text-gray-400 ml-2">{p.sub}</span>
                </div>
                <span className="text-sm font-bold text-brand-teal">{p.price}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs text-gray-400">Changes apply to the registration form immediately after saving</p>
            <button
              onClick={save}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                saved ? 'bg-green-50 text-green-700' : 'bg-brand-navy text-white hover:bg-brand-navy/90'
              }`}
            >
              {saved ? '✓ Saved' : 'Save Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
