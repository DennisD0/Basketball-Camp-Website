'use client'

import { useState, useEffect } from 'react'
import { DEFAULT_CONFIG, type RegistrationConfig } from '@/lib/registration-config'

const TABS = ['Program Info', 'Packages', 'Sports & Schedule', 'Contract Terms'] as const
type Tab = typeof TABS[number]

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  )
}
function UpIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="18 15 12 9 6 15" /></svg>
}
function DownIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="6 9 12 15 18 9" /></svg>
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-teal/40 bg-white'

export default function RegistrationEditor() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('Program Info')
  const [config, setConfig] = useState<RegistrationConfig>(DEFAULT_CONFIG)
  const [isCustom, setIsCustom] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/registration-config')
      .then(r => r.json())
      .then(d => { setConfig(d.config); setIsCustom(d.custom); setLoading(false) })
      .catch(() => setLoading(false))
  }, [open])

  function touch() { setStatus('idle') }

  async function handleSave() {
    setSaving(true)
    setStatus('idle')
    setErrorMsg('')
    const res = await fetch('/api/registration-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    })
    setSaving(false)
    if (res.ok) { setStatus('saved'); setIsCustom(true) }
    else {
      const d = await res.json().catch(() => ({}))
      setErrorMsg(d.error || 'Could not save.')
      setStatus('error')
    }
  }

  async function handleReset() {
    if (!confirm('Reset the ENTIRE registration page (program info, packages, sports, and contract) to the default? Your custom version will be discarded.')) return
    setSaving(true)
    await fetch('/api/registration-config', { method: 'DELETE' })
    const d = await (await fetch('/api/registration-config')).json()
    setConfig(d.config)
    setIsCustom(false)
    setSaving(false)
    setStatus('idle')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="min-h-[44px] flex items-center gap-2 bg-white text-brand-navy px-4 rounded-xl text-sm font-semibold ring-1 ring-black/10 shadow-sm hover:bg-gray-50 hover:ring-black/15 transition-all active:scale-[0.98]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Edit Registration Form
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm p-3 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col max-h-full w-full max-w-3xl mx-auto my-auto overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="font-condensed font-bold text-lg text-brand-navy leading-tight">Edit Registration Form</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Everything shown on the public /register page
                  {isCustom && <span className="ml-1.5 text-brand-teal font-semibold">· custom version live</span>}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors flex-shrink-0">
                <CloseIcon />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-2 overflow-x-auto flex-shrink-0 scrollbar-none">
              {TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-colors border-b-2 ${
                    tab === t ? 'text-brand-navy border-brand-navy' : 'text-gray-400 border-transparent hover:text-gray-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 px-5 py-5">
              {loading ? (
                <p className="text-sm text-gray-400 text-center py-10">Loading…</p>
              ) : (
                <>
                  {tab === 'Program Info' && (
                    <ProgramInfoTab config={config} setConfig={setConfig} touch={touch} />
                  )}
                  {tab === 'Packages' && (
                    <PackagesTab config={config} setConfig={setConfig} touch={touch} />
                  )}
                  {tab === 'Sports & Schedule' && (
                    <SportsTab config={config} setConfig={setConfig} touch={touch} />
                  )}
                  {tab === 'Contract Terms' && (
                    <ContractTab config={config} setConfig={setConfig} touch={touch} />
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 space-y-2">
              {status === 'saved' && <p className="text-sm text-emerald-600 bg-emerald-50 rounded-xl px-3.5 py-2.5">Saved — the /register page now shows this version.</p>}
              {status === 'error' && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3.5 py-2.5">{errorMsg}</p>}
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  disabled={saving || !isCustom}
                  className="min-h-[44px] px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-all"
                >
                  Reset all to default
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 min-h-[44px] rounded-xl bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy/90 disabled:opacity-50 transition-all active:scale-[0.99]"
                >
                  {saving ? 'Saving…' : 'Save Registration Form'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

type TabProps = {
  config: RegistrationConfig
  setConfig: React.Dispatch<React.SetStateAction<RegistrationConfig>>
  touch: () => void
}

// --- Program Info ---
function ProgramInfoTab({ config, setConfig, touch }: TabProps) {
  const { programInfo } = config

  function updateInfo<K extends keyof typeof programInfo>(key: K, value: typeof programInfo[K]) {
    setConfig(c => ({ ...c, programInfo: { ...c.programInfo, [key]: value } }))
    touch()
  }
  function updateLine(field: 'scheduleLines' | 'pricingLines', i: number, value: string) {
    setConfig(c => ({
      ...c,
      programInfo: { ...c.programInfo, [field]: c.programInfo[field].map((l, j) => (j === i ? value : l)) },
    }))
    touch()
  }
  function addLine(field: 'scheduleLines' | 'pricingLines') {
    setConfig(c => ({ ...c, programInfo: { ...c.programInfo, [field]: [...c.programInfo[field], ''] } }))
    touch()
  }
  function removeLine(field: 'scheduleLines' | 'pricingLines', i: number) {
    setConfig(c => ({ ...c, programInfo: { ...c.programInfo, [field]: c.programInfo[field].filter((_, j) => j !== i) } }))
    touch()
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Location line</label>
        <input value={programInfo.locationLine} onChange={e => updateInfo('locationLine', e.target.value)} className={inputCls} placeholder="📍 Address" />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Schedule bullets</label>
        <div className="space-y-2">
          {programInfo.scheduleLines.map((line, i) => (
            <div key={i} className="flex gap-2">
              <input value={line} onChange={e => updateLine('scheduleLines', i, e.target.value)} className={inputCls} placeholder="🏀 Basketball — …" />
              <button onClick={() => removeLine('scheduleLines', i)} className="w-9 h-9 flex-shrink-0 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => addLine('scheduleLines')} className="mt-2 text-xs font-semibold text-brand-teal hover:underline">+ Add schedule line</button>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Pricing bullets</label>
        <div className="space-y-2">
          {programInfo.pricingLines.map((line, i) => (
            <div key={i} className="flex gap-2">
              <input value={line} onChange={e => updateLine('pricingLines', i, e.target.value)} className={inputCls} placeholder="5 sessions — $150 …" />
              <button onClick={() => removeLine('pricingLines', i)} className="w-9 h-9 flex-shrink-0 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => addLine('pricingLines')} className="mt-2 text-xs font-semibold text-brand-teal hover:underline">+ Add pricing line</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Payment method</label>
          <input value={programInfo.paymentMethod} onChange={e => updateInfo('paymentMethod', e.target.value)} className={inputCls} placeholder="Zelle: 347-200-4439" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Payment note</label>
          <input value={programInfo.paymentNote} onChange={e => updateInfo('paymentNote', e.target.value)} className={inputCls} placeholder="Include child's name in memo" />
        </div>
      </div>
    </div>
  )
}

// --- Packages ---
function PackagesTab({ config, setConfig, touch }: TabProps) {
  const { packages } = config

  function update(i: number, patch: Partial<typeof packages[0]>) {
    setConfig(c => ({ ...c, packages: c.packages.map((p, j) => (j === i ? { ...p, ...patch } : p)) }))
    touch()
  }
  function add() {
    setConfig(c => ({ ...c, packages: [...c.packages, { value: `package_${Date.now()}`, label: '', price: '', sessions: 1, description: '', badge: null }] }))
    touch()
  }
  function remove(i: number) {
    setConfig(c => ({ ...c, packages: c.packages.filter((_, j) => j !== i) }))
    touch()
  }
  function move(i: number, dir: -1 | 1) {
    setConfig(c => {
      const next = [...c.packages]
      const j = i + dir
      if (j < 0 || j >= next.length) return c
      ;[next[i], next[j]] = [next[j], next[i]]
      return { ...c, packages: next }
    })
    touch()
  }

  return (
    <div className="space-y-4">
      {packages.map((p, i) => (
        <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-300">Package {i + 1}</span>
            <div className="flex gap-1">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center transition-colors"><UpIcon /></button>
              <button onClick={() => move(i, 1)} disabled={i === packages.length - 1} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center transition-colors"><DownIcon /></button>
              <button onClick={() => remove(i)} className="w-8 h-8 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"><TrashIcon /></button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Label</label>
              <input value={p.label} onChange={e => update(i, { label: e.target.value })} className={inputCls} placeholder="5 Sessions" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Price</label>
              <input value={p.price} onChange={e => update(i, { price: e.target.value })} className={inputCls} placeholder="$150" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1"># Sessions</label>
              <input type="number" min="1" value={p.sessions} onChange={e => update(i, { sessions: Number(e.target.value) || 1 })} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Badge</label>
              <input value={p.badge ?? ''} onChange={e => update(i, { badge: e.target.value || null })} className={inputCls} placeholder="Best Value" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Description</label>
            <input value={p.description} onChange={e => update(i, { description: e.target.value })} className={inputCls} placeholder="5 classes · complete within 7 weeks" />
          </div>
        </div>
      ))}
      <button onClick={add} className="w-full min-h-[44px] rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-brand-teal/40 hover:text-brand-teal transition-colors">
        + Add Package
      </button>
    </div>
  )
}

// --- Sports & Schedule ---
function SportsTab({ config, setConfig, touch }: TabProps) {
  const { sports } = config

  function updateSportName(i: number, name: string) {
    setConfig(c => ({ ...c, sports: c.sports.map((s, j) => (j === i ? { ...s, sport: name } : s)) }))
    touch()
  }
  function addSport() {
    setConfig(c => ({ ...c, sports: [...c.sports, { sport: '', slots: [{ time: '', ages: '' }] }] }))
    touch()
  }
  function removeSport(i: number) {
    setConfig(c => ({ ...c, sports: c.sports.filter((_, j) => j !== i) }))
    touch()
  }
  function updateSlot(i: number, si: number, field: 'time' | 'ages', value: string) {
    setConfig(c => ({
      ...c,
      sports: c.sports.map((s, j) => (j === i ? { ...s, slots: s.slots.map((sl, k) => (k === si ? { ...sl, [field]: value } : sl)) } : s)),
    }))
    touch()
  }
  function addSlot(i: number) {
    setConfig(c => ({ ...c, sports: c.sports.map((s, j) => (j === i ? { ...s, slots: [...s.slots, { time: '', ages: '' }] } : s)) }))
    touch()
  }
  function removeSlot(i: number, si: number) {
    setConfig(c => ({ ...c, sports: c.sports.map((s, j) => (j === i ? { ...s, slots: s.slots.filter((_, k) => k !== si) } : s)) }))
    touch()
  }

  return (
    <div className="space-y-4">
      {sports.map((s, i) => (
        <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input value={s.sport} onChange={e => updateSportName(i, e.target.value)} className={`${inputCls} flex-1 font-semibold`} placeholder="Sport name" />
            <button onClick={() => removeSport(i)} className="w-9 h-9 flex-shrink-0 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"><TrashIcon /></button>
          </div>
          <div className="space-y-2 pl-2 border-l-2 border-gray-100">
            {s.slots.map((slot, si) => (
              <div key={si} className="flex gap-2">
                <input value={slot.time} onChange={e => updateSlot(i, si, 'time', e.target.value)} className={inputCls} placeholder="Tue 4–5PM" />
                <input value={slot.ages} onChange={e => updateSlot(i, si, 'ages', e.target.value)} className={inputCls} placeholder="Ages 7–12" />
                <button onClick={() => removeSlot(i, si)} className="w-9 h-9 flex-shrink-0 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"><TrashIcon /></button>
              </div>
            ))}
            <button onClick={() => addSlot(i)} className="text-xs font-semibold text-brand-teal hover:underline">+ Add time slot</button>
          </div>
        </div>
      ))}
      <button onClick={addSport} className="w-full min-h-[44px] rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-brand-teal/40 hover:text-brand-teal transition-colors">
        + Add Sport
      </button>
    </div>
  )
}

// --- Contract Terms ---
function ContractTab({ config, setConfig, touch }: TabProps) {
  const { contractSections } = config

  function update(i: number, field: 'title' | 'body', value: string) {
    setConfig(c => ({ ...c, contractSections: c.contractSections.map((s, j) => (j === i ? { ...s, [field]: value } : s)) }))
    touch()
  }
  function add() {
    setConfig(c => ({ ...c, contractSections: [...c.contractSections, { title: '', body: '' }] }))
    touch()
  }
  function remove(i: number) {
    setConfig(c => ({ ...c, contractSections: c.contractSections.filter((_, j) => j !== i) }))
    touch()
  }
  function move(i: number, dir: -1 | 1) {
    setConfig(c => {
      const next = [...c.contractSections]
      const j = i + dir
      if (j < 0 || j >= next.length) return c
      ;[next[i], next[j]] = [next[j], next[i]]
      return { ...c, contractSections: next }
    })
    touch()
  }

  return (
    <div className="space-y-4">
      {contractSections.map((s, i) => (
        <div key={i} className="rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-300 w-5 flex-shrink-0">{i + 1}</span>
            <input value={s.title} onChange={e => update(i, 'title', e.target.value)} className={`${inputCls} flex-1 font-semibold`} placeholder="Section title" />
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center transition-colors"><UpIcon /></button>
              <button onClick={() => move(i, 1)} disabled={i === contractSections.length - 1} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center transition-colors"><DownIcon /></button>
              <button onClick={() => remove(i)} className="w-8 h-8 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"><TrashIcon /></button>
            </div>
          </div>
          <textarea value={s.body} onChange={e => update(i, 'body', e.target.value)} rows={3} className={`${inputCls} resize-y leading-relaxed`} placeholder="Section text…" />
        </div>
      ))}
      <button onClick={add} className="w-full min-h-[44px] rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-brand-teal/40 hover:text-brand-teal transition-colors">
        + Add Section
      </button>
    </div>
  )
}
