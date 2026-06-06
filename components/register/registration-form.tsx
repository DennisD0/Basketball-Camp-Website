'use client'

import { useState } from 'react'

const PROGRAMS = [
  { value: 'early_bird',   label: 'Early Bird — $350', sub: 'by June 6' },
  { value: 'memorial_day', label: 'Memorial Day Sale — $300', sub: 'by May 31' },
  { value: 'regular',      label: 'Regular — $400', sub: 'by July 5' },
]

const AGE_GROUPS = ['U12 (Ages 12–13)', 'U14 (Ages 14–15)', 'U16 (Ages 15–16)']
const SPORTS     = ['Basketball', 'Volleyball']

export default function RegistrationForm() {
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    parentName:      '',
    parentPhone:     '',
    whatsappConsent: false,
    childName:       '',
    sport:           '',
    ageGroup:        '',
    programOption:   '',
    mediaConsent:    false,
    injuryWaiver:    false,
    noRefundAck:     false,
  })

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const ageValue = form.ageGroup.split(' ')[0] // "U12", "U14", "U16"

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, ageGroup: ageValue }),
    })

    setLoading(false)
    if (res.ok) {
      setStep('success')
    } else {
      const data = await res.json()
      setError(data.error || 'Something went wrong. Please try again.')
    }
  }

  if (step === 'success') {
    return (
      <div className="text-center py-12 px-6">
        <div className="w-16 h-16 rounded-full bg-brand-teal/10 flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2C6E6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-brand-navy mb-2">You're registered!</h2>
        <p className="text-gray-500 mb-6">We'll be in touch with next steps. See you on the court!</p>
        <div className="bg-[#F4F2EE] rounded-2xl p-5 text-left max-w-sm mx-auto">
          <p className="text-sm font-semibold text-gray-700 mb-2">Payment Instructions</p>
          <p className="text-sm text-gray-500">Zelle: <span className="font-medium text-gray-800">347-200-4439</span></p>
          <p className="text-sm text-gray-500">Venmo: <span className="font-medium text-gray-800">@benro97</span></p>
          <p className="text-xs text-gray-400 mt-2">Include your child's name in the memo.</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Parent info */}
      <fieldset>
        <legend className="text-sm font-semibold text-brand-navy mb-3 uppercase tracking-wide">Parent / Guardian</legend>
        <div className="space-y-4">
          <Field label="Full Name" required>
            <input
              type="text" required placeholder="Jane Smith"
              value={form.parentName} onChange={e => set('parentName', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Phone Number" required>
            <input
              type="tel" required placeholder="(413) 555-0100"
              value={form.parentPhone} onChange={e => set('parentPhone', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Checkbox
            id="whatsapp"
            checked={form.whatsappConsent}
            onChange={v => set('whatsappConsent', v)}
            label="I'm willing to use WhatsApp for group communications with coaches"
          />
        </div>
      </fieldset>

      <hr className="border-gray-100" />

      {/* Child info */}
      <fieldset>
        <legend className="text-sm font-semibold text-brand-navy mb-3 uppercase tracking-wide">Child</legend>
        <div className="space-y-4">
          <Field label="Child's Full Name" required>
            <input
              type="text" required placeholder="Alex Smith"
              value={form.childName} onChange={e => set('childName', e.target.value)}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sport" required>
              <select required value={form.sport} onChange={e => set('sport', e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Age Group" required>
              <select required value={form.ageGroup} onChange={e => set('ageGroup', e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                {AGE_GROUPS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
          </div>
        </div>
      </fieldset>

      <hr className="border-gray-100" />

      {/* Program selection */}
      <fieldset>
        <legend className="text-sm font-semibold text-brand-navy mb-3 uppercase tracking-wide">Registration Option</legend>
        <div className="space-y-2">
          {PROGRAMS.map(p => (
            <label
              key={p.value}
              className={`flex items-center justify-between gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                form.programOption === p.value
                  ? 'border-brand-teal bg-brand-teal/5'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio" name="program" value={p.value} required
                  checked={form.programOption === p.value}
                  onChange={() => set('programOption', p.value)}
                  className="accent-[#2C6E6A]"
                />
                <span className="text-sm font-medium text-gray-800">{p.label}</span>
              </div>
              <span className="text-xs text-gray-400">{p.sub}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <hr className="border-gray-100" />

      {/* Consents */}
      <fieldset>
        <legend className="text-sm font-semibold text-brand-navy mb-3 uppercase tracking-wide">Agreements</legend>
        <div className="space-y-3">
          <Checkbox
            id="media"
            checked={form.mediaConsent}
            onChange={v => set('mediaConsent', v)}
            label="Media Consent — I give permission for my child to appear in photos/videos for promotional and social media use."
          />
          <Checkbox
            id="injury"
            required
            checked={form.injuryWaiver}
            onChange={v => set('injuryWaiver', v)}
            label="Injury Liability Waiver — I understand this is a physical activity and release the coaches and 413 Youth Club from liability for injuries. (Required)"
          />
          <Checkbox
            id="refund"
            required
            checked={form.noRefundAck}
            onChange={v => set('noRefundAck', v)}
            label="No Refund Policy — I understand all payments are final and non-refundable. (Required)"
          />
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-teal text-white py-3.5 rounded-full font-semibold text-sm hover:bg-brand-teal/90 transition-all disabled:opacity-60 hover:-translate-y-0.5"
      >
        {loading ? 'Submitting…' : 'Submit Registration'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        After submitting, you'll receive payment instructions. No spot is held until payment is received.
      </p>
    </form>
  )
}

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/40 bg-white'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-brand-orange ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function Checkbox({ id, checked, onChange, label, required }: {
  id: string; checked: boolean; onChange: (v: boolean) => void; label: string; required?: boolean
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
      <input
        id={id} type="checkbox" required={required}
        checked={checked} onChange={e => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[#2C6E6A] cursor-pointer flex-shrink-0"
      />
      <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">{label}</span>
    </label>
  )
}
