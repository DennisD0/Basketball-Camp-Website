'use client'

import { useState } from 'react'

const SPORTS = ['Basketball', 'Volleyball']

const PRICING_TIERS = [
  { value: 'early_bird',   label: 'Early Bird',   price: '$350', sub: 'Register by June 6',  badge: 'Save $50' },
  { value: 'memorial_day', label: 'Best Deal',    price: '$300', sub: 'Register by May 31',  badge: 'Save $100' },
  { value: 'regular',      label: 'Standard',     price: '$400', sub: 'Register by July 5',  badge: null },
]

// Combined key used for API + contract display
function sportProgramKey(sport: string, tier: string) {
  return `${sport.toLowerCase()}_${tier}`
}

const PACKAGES = [
  { value: '5-week', label: '5-Week Package', sessions: 5, windowWeeks: 7, description: '5 classes · complete within 7 weeks' },
  { value: '7-week', label: '7-Week Package', sessions: 7, windowWeeks: 9, description: '7 classes · complete within 9 weeks' },
]

const AGE_GROUPS = [
  'U6 (Ages 5–6)',
  'U8 (Ages 7–8)',
  'U10 (Ages 9–10)',
  'U12 (Ages 11–12)',
  'U14 (Ages 13–14)',
  'U16 (Ages 15–16)',
]

export default function RegistrationForm() {
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    parentName:      '',
    parentEmail:     '',
    parentPhone:     '',
    whatsappConsent: false,
    childName:       '',
    ageGroup:        '',
    sport:           '',   // Basketball | Volleyball
    pricingTier:     '',   // early_bird | memorial_day | regular
    packageOption:   '',   // must be explicitly chosen before pricing reveals
    mediaConsent:    false,
    injuryWaiver:    false,
    noRefundAck:     false,
  })

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setStep('confirm')
  }

  async function handleConfirm() {
    setLoading(true)
    setError('')

    const ageValue = form.ageGroup.split(' ')[0]
    const programOption = sportProgramKey(form.sport, form.pricingTier)

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentName:      form.parentName,
        parentEmail:     form.parentEmail,
        parentPhone:     form.parentPhone,
        whatsappConsent: form.whatsappConsent,
        childName:       form.childName,
        ageGroup:        ageValue,
        sport:           form.sport,
        programOption,
        packageOption:   form.packageOption,
        mediaConsent:    form.mediaConsent,
        injuryWaiver:    form.injuryWaiver,
        noRefundAck:     form.noRefundAck,
      }),
    })

    setLoading(false)
    if (res.ok) {
      setStep('success')
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Something went wrong. Please try again.')
      setStep('form')
    }
  }

  if (step === 'confirm') {
    const tier = PRICING_TIERS.find(t => t.value === form.pricingTier)
    const pkg = PACKAGES.find(p => p.value === form.packageOption)
    return (
      <div className="space-y-6">
        <div className="text-center mb-2">
          <h2 className="text-xl font-bold text-brand-navy">Review Your Registration</h2>
          <p className="text-sm text-gray-400 mt-1">Please confirm the details below before submitting.</p>
        </div>

        <div className="bg-[#F4F2EE] rounded-2xl p-5 space-y-3">
          <Row label="Child's Name"     value={form.childName} />
          <Row label="Age Group"        value={form.ageGroup} />
          <Row label="Sport"            value={form.sport} />
          <Row label="Pricing Option"   value={tier ? `${tier.label} (${tier.price})` : form.pricingTier} />
          <Row label="Package"          value={pkg ? `${pkg.label} — ${pkg.sessions} classes` : form.packageOption} />
          <Row label="Parent / Guardian" value={form.parentName} />
          <Row label="Email"            value={form.parentEmail} />
          <Row label="Phone"            value={form.parentPhone} />
        </div>

        <div className="bg-white rounded-2xl p-5 ring-1 ring-black/5 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Agreements Confirmed</p>
          <AckRow checked={form.injuryWaiver}    label="Injury Liability Waiver" />
          <AckRow checked={form.noRefundAck}     label="No Refund Policy" />
          <AckRow checked={form.mediaConsent}    label="Media Consent" />
          <AckRow checked={form.whatsappConsent} label="WhatsApp Group Communications" />
        </div>

        <div className="bg-brand-teal/5 rounded-2xl p-5 ring-1 ring-brand-teal/20">
          <p className="text-xs font-semibold text-brand-teal uppercase tracking-wider mb-2">Payment Instructions</p>
          <p className="text-sm text-gray-600">Zelle: <span className="font-semibold text-gray-800">347-200-4439</span></p>
          <p className="text-xs text-gray-400 mt-2">Include your child's name in the memo. No spot is held until payment is received.</p>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep('form')}
            className="flex-1 py-3 rounded-full border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-full bg-brand-teal text-white text-sm font-semibold hover:bg-brand-teal/90 disabled:opacity-60 transition-all"
          >
            {loading ? 'Submitting…' : 'Confirm & Submit'}
          </button>
        </div>
      </div>
    )
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
          <Field label="Email Address" required>
            <input
              type="email" required placeholder="jane@email.com"
              value={form.parentEmail} onChange={e => set('parentEmail', e.target.value)}
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
          <Field label="Age Group" required>
            <select required value={form.ageGroup} onChange={e => set('ageGroup', e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              {AGE_GROUPS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
        </div>
      </fieldset>

      <hr className="border-gray-100" />

      {/* Package selection — always shown first */}
      <fieldset>
        <legend className="text-sm font-semibold text-brand-navy mb-3 uppercase tracking-wide">Session Package</legend>
        <div className="space-y-2">
          {PACKAGES.map(p => {
            const selected = form.packageOption === p.value
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => {
                  if (selected) {
                    set('packageOption', ''); set('sport', ''); set('pricingTier', '')
                  } else {
                    set('packageOption', p.value); set('sport', ''); set('pricingTier', '')
                  }
                }}
                className={`w-full flex items-center justify-between gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all text-left active:scale-[0.98] ${
                  selected ? 'border-brand-teal bg-brand-teal/5' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    selected ? 'border-brand-teal' : 'border-gray-300'
                  }`}>
                    {selected && <span className="w-2 h-2 rounded-full bg-brand-teal" />}
                  </span>
                  <div>
                    <span className="text-sm font-semibold text-gray-800">{p.label}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-brand-teal flex-shrink-0">{p.sessions} classes</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Sport — revealed after package chosen */}
      <div className={`transition-all duration-300 overflow-hidden ${
        form.packageOption ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
      }`}>
        <hr className="border-gray-100 mb-6" />
        <fieldset>
          <legend className="text-sm font-semibold text-brand-navy mb-3 uppercase tracking-wide">Sport</legend>
          <div className="space-y-2">
            {SPORTS.map(s => {
              const selected = form.sport === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    if (selected) {
                      set('sport', ''); set('pricingTier', '')
                    } else {
                      set('sport', s); set('pricingTier', '')
                    }
                  }}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all text-left active:scale-[0.98] ${
                    selected ? 'border-brand-teal bg-brand-teal/5' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    selected ? 'border-brand-teal' : 'border-gray-300'
                  }`}>
                    {selected && <span className="w-2 h-2 rounded-full bg-brand-teal" />}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">{s}</span>
                </button>
              )
            })}
          </div>
        </fieldset>
      </div>

      {/* Pricing tier — revealed after sport chosen */}
      <div className={`transition-all duration-300 overflow-hidden ${
        form.sport ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
      }`}>
        <hr className="border-gray-100 mb-6" />
        <fieldset>
          <legend className="text-sm font-semibold text-brand-navy mb-1 uppercase tracking-wide">Pricing Option</legend>
          <p className="text-xs text-gray-400 mb-3">Select the pricing tier that applies to you</p>
          <div className="space-y-2">
            {PRICING_TIERS.map(t => {
              const selected = form.pricingTier === t.value
              return (
              <button
                key={t.value}
                type="button"
                onClick={() => set('pricingTier', selected ? '' : t.value)}
                className={`w-full flex items-center justify-between gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all text-left active:scale-[0.98] ${
                  selected ? 'border-brand-teal bg-brand-teal/5' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    selected ? 'border-brand-teal' : 'border-gray-300'
                  }`}>
                    {selected && <span className="w-2 h-2 rounded-full bg-brand-teal" />}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{t.label}</span>
                      {t.badge && (
                        <span className="text-[10px] font-bold text-brand-teal bg-brand-teal/10 px-1.5 py-0.5 rounded-full">
                          {t.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{t.sub}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-brand-teal flex-shrink-0">{t.price}</span>
              </button>
              )
            })}
          </div>
        </fieldset>
      </div>

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
        {loading ? 'Submitting…' : 'Review Registration'}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-medium text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-800 text-right">{value || '—'}</span>
    </div>
  )
}

function AckRow({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${checked ? 'bg-brand-teal' : 'bg-gray-200'}`}>
        {checked && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
      </span>
      <span className={`text-xs ${checked ? 'text-gray-700' : 'text-gray-400 line-through'}`}>{label}</span>
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
