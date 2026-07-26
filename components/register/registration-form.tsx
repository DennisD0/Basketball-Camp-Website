'use client'

import { useState, useCallback } from 'react'
import { DEFAULT_CONFIG, type RegistrationConfig, type ContractSection, type SessionPackage } from '@/lib/registration-config'

function sportProgramKey(sport: string, pkg: string) {
  return `${sport.toLowerCase()}_${pkg}`
}

const AGE_GROUPS = [
  'U6 (Ages 5–6)',
  'U8 (Ages 7–8)',
  'U10 (Ages 9–10)',
  'U12 (Ages 11–12)',
  'U14 (Ages 13–14)',
  'U16 (Ages 15–16)',
]

// --- Scroll-to-enable terms modal ---
function TermsModal({
  form,
  packages,
  sections,
  paymentMethod,
  paymentNote,
  loading,
  canSubmit,
  onScrollBottom,
  onConfirm,
  onClose,
  error,
}: {
  form: ReturnType<typeof buildInitialForm>
  packages: SessionPackage[]
  sections: ContractSection[]
  paymentMethod: string
  paymentNote: string
  loading: boolean
  canSubmit: boolean
  onScrollBottom: () => void
  onConfirm: () => void
  onClose: () => void
  error: string
}) {
  const pkg = packages.find(p => p.value === form.packageOption)

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      onScrollBottom()
    }
  }, [onScrollBottom])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col max-h-full w-full max-w-lg mx-auto my-auto">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-brand-navy text-base">Review & Confirm</h2>
            <p className="text-xs text-gray-400 mt-0.5">Scroll to the bottom to enable registration</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4" onScroll={handleScroll}>
          {/* Registration summary */}
          <div className="bg-[#F4F2EE] rounded-xl p-4 space-y-2 text-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Registration Summary</p>
            <SummaryRow label="Child" value={form.childName} />
            <SummaryRow label="Age Group" value={form.ageGroup} />
            <SummaryRow label="Sport" value={form.sport} />
            <SummaryRow label="Package" value={pkg ? `${pkg.label} — ${pkg.price}` : form.packageOption} />
            <SummaryRow label="Parent" value={form.parentName} />
            <SummaryRow label="Email" value={form.parentEmail} />
            <SummaryRow label="Phone" value={form.parentPhone} />
            {form.referredBy && <SummaryRow label="Referred by" value={form.referredBy} />}
          </div>

          {/* Payment info */}
          <div className="bg-brand-teal/5 rounded-xl p-4 ring-1 ring-brand-teal/20">
            <p className="text-xs font-semibold text-brand-teal uppercase tracking-wider mb-1.5">Payment Instructions</p>
            <p className="text-sm text-gray-600">{paymentMethod}</p>
            <p className="text-xs text-gray-400 mt-1.5">{paymentNote}. No spot is held until payment is received.</p>
          </div>

          {/* Terms & Conditions */}
          <div className="rounded-xl border border-gray-200 p-4 text-xs text-gray-600 space-y-3">
            <p className="font-semibold text-gray-800 text-sm">Terms & Conditions</p>

            {/* Contract sections — staff-editable via Registrations → Edit Registration Form */}
            {sections.map((s, i) => (
              <div key={i}>
                <p className="font-semibold text-gray-700 mb-1">{i + 1}. {s.title}</p>
                <p className="whitespace-pre-line">{s.body}</p>
              </div>
            ))}

            {/* Media consent status (dynamic) */}
            <div className="bg-brand-teal/5 rounded-lg p-3">
              <p className="font-semibold text-gray-700 mb-1">Your Media Consent Choice</p>
              {form.mediaConsent
                ? <p>You have consented to allow your child to appear in photos and videos used for promotional and social media purposes.</p>
                : <p>You have <strong>not</strong> consented to media use. Your child's image will not be used without further permission.</p>
              }
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mt-2">
              <p className="font-semibold text-gray-800 mb-1">Agreements Confirmed</p>
              <ul className="space-y-1">
                <AgreementLine ok={form.injuryWaiver}  label="Injury Liability Waiver" />
                <AgreementLine ok={form.noRefundAck}   label="No Refund Policy" />
                <AgreementLine ok={form.mediaConsent}  label="Media Consent" />
                <AgreementLine ok={form.whatsappConsent} label="WhatsApp Group Communications" />
                <AgreementLine ok={form.competingAck}  label="Session Window Agreement (complete within 7 or 9 weeks)" />
              </ul>
            </div>

            <div className="pt-2">
              <p className="font-semibold text-gray-700 mb-1">Signature</p>
              <p>Signed by: <span className="font-medium text-gray-900">{form.printedName}</span></p>
              <p>Date: <span className="font-medium text-gray-900">{form.signedDate}</span></p>
            </div>
          </div>

          {/* Scroll cue */}
          {!canSubmit && (
            <div className="text-center py-2 text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
              </svg>
              Keep scrolling to enable registration
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 space-y-2">
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button
            onClick={onConfirm}
            disabled={!canSubmit || loading}
            className={`w-full py-3 rounded-full text-sm font-semibold transition-all ${
              canSubmit && !loading
                ? 'bg-brand-teal text-white hover:bg-brand-teal/90 active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? 'Submitting…' : canSubmit ? 'Confirm & Register' : 'Scroll to unlock'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-medium text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-800 text-right">{value || '—'}</span>
    </div>
  )
}

function AgreementLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className={`mt-0.5 flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center ${ok ? 'bg-brand-teal' : 'bg-gray-300'}`}>
        {ok && <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
      </span>
      <span className={ok ? 'text-gray-700' : 'text-gray-400 line-through'}>{label}</span>
    </li>
  )
}

// --- Main form ---
function buildInitialForm() {
  return {
    parentName:      '',
    parentEmail:     '',
    parentPhone:     '',
    whatsappConsent: false,
    childName:       '',
    ageGroup:        '',
    sport:           '' as string,
    packageOption:   '',
    referredBy:      '',
    mediaConsent:    false,
    injuryWaiver:    false,
    noRefundAck:     false,
    competingAck:    false,
    printedName:     '',
    signedDate:      '',
  }
}

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/40 bg-white'

export default function RegistrationForm({ initialConfig }: { initialConfig?: RegistrationConfig }) {
  const config = initialConfig ?? DEFAULT_CONFIG
  const { packages, sports, contractSections, programInfo } = config

  const [step, setStep] = useState<'form' | 'success'>('form')
  const [showModal, setShowModal] = useState(false)
  const [canSubmit, setCanSubmit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(buildInitialForm)

  function set<K extends keyof ReturnType<typeof buildInitialForm>>(key: K, value: ReturnType<typeof buildInitialForm>[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.packageOption) { setError('Please select a session package.'); return }
    if (!form.sport) { setError('Please select a sport.'); return }
    if (!form.injuryWaiver || !form.noRefundAck || !form.competingAck) {
      setError('Please agree to all required terms before continuing.'); return
    }
    if (!form.printedName.trim() || !form.signedDate.trim()) {
      setError('Please enter your printed name and date.'); return
    }
    setShowModal(true)
    setCanSubmit(false)
  }

  async function handleConfirm() {
    setLoading(true)
    setError('')

    const ageValue = form.ageGroup.split(' ')[0]
    const programOption = sportProgramKey(form.sport, form.packageOption)
    const pkg = packages.find(p => p.value === form.packageOption)

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
        sessionsTotal:   pkg?.sessions ?? 5,
        referredBy:      form.referredBy.trim() || null,
        mediaConsent:    form.mediaConsent,
        injuryWaiver:    form.injuryWaiver,
        noRefundAck:     form.noRefundAck,
        printedName:     form.printedName,
        signedDate:      form.signedDate,
      }),
    })

    setLoading(false)
    if (res.ok) {
      setShowModal(false)
      setStep('success')
    } else {
      const data = await res.json().catch(() => ({}))
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
          <p className="text-xs text-gray-400 mt-2">Include your child's name in the memo.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {showModal && (
        <TermsModal
          form={form}
          packages={packages}
          sections={contractSections}
          paymentMethod={programInfo.paymentMethod}
          paymentNote={programInfo.paymentNote}
          loading={loading}
          canSubmit={canSubmit}
          onScrollBottom={() => setCanSubmit(true)}
          onConfirm={handleConfirm}
          onClose={() => setShowModal(false)}
          error={error}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Parent / Guardian */}
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

        {/* Child */}
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

        {/* Session Package — always visible */}
        <fieldset>
          <legend className="text-sm font-semibold text-brand-navy mb-1 uppercase tracking-wide">Session Package</legend>
          <p className="text-xs text-gray-400 mb-3">Choose how many sessions to purchase</p>
          <div className="space-y-2">
            {packages.map(p => {
              const selected = form.packageOption === p.value
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    if (selected) { set('packageOption', ''); set('sport', '') }
                    else { set('packageOption', p.value); set('sport', '') }
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
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{p.label}</span>
                        {p.badge && (
                          <span className="text-[10px] font-bold text-brand-teal bg-brand-teal/10 px-1.5 py-0.5 rounded-full">
                            {p.badge}
                          </span>
                        )}
                      </div>
                      {/* Description broken into two visible chips so clients clearly see what they're buying */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {p.description.split(' · ').map((part, i) => (
                          <span
                            key={i}
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              i === 0
                                ? 'bg-brand-navy/8 text-brand-navy'
                                : 'bg-brand-orange/10 text-brand-orange'
                            }`}
                          >
                            {part}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-brand-teal flex-shrink-0">{p.price}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        {/* Sport — revealed after package chosen */}
        <div className={`transition-all duration-300 overflow-hidden ${
          form.packageOption ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        }`}>
          <hr className="border-gray-100 mb-6" />
          <fieldset>
            <legend className="text-sm font-semibold text-brand-navy mb-1 uppercase tracking-wide">Sport</legend>
            <p className="text-xs text-gray-400 mb-3">Select the sport and review the schedule</p>
            <div className="space-y-2">
              {sports.map(({ sport: s, slots: schedule }) => {
                const selected = form.sport === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      if (selected) { set('sport', ''); set('referredBy', '') }
                      else { set('sport', s); set('referredBy', '') }
                    }}
                    className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all text-left active:scale-[0.98] ${
                      selected ? 'border-brand-teal bg-brand-teal/5' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      selected ? 'border-brand-teal' : 'border-gray-300'
                    }`}>
                      {selected && <span className="w-2 h-2 rounded-full bg-brand-teal" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-gray-800">{s}</span>
                      <div className="mt-1.5 space-y-1">
                        {schedule.map((slot, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="font-medium text-gray-700">{slot.time}</span>
                            <span className="text-gray-300">·</span>
                            <span>{slot.ages}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </fieldset>
        </div>

        {/* Affiliate / Referral — volleyball only */}
        <div className={`transition-all duration-300 overflow-hidden ${
          form.sport === 'Volleyball' ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        }`}>
          <hr className="border-gray-100 mb-6" />
          <fieldset>
            <legend className="text-sm font-semibold text-brand-navy mb-1 uppercase tracking-wide">Referral (Optional)</legend>
            <p className="text-xs text-gray-400 mb-3">
              Were you invited by a current member? Enter their name and you both receive <span className="font-semibold text-brand-teal">5% off</span> — verified by admin. Volleyball only.
            </p>
            <Field label="Referred by (full name)">
              <input
                type="text"
                placeholder="Leave blank if not applicable"
                value={form.referredBy}
                onChange={e => set('referredBy', e.target.value)}
                className={inputCls}
              />
            </Field>
          </fieldset>
        </div>

        <hr className="border-gray-100" />

        {/* Agreements */}
        <fieldset>
          <legend className="text-sm font-semibold text-brand-navy mb-3 uppercase tracking-wide">Agreements</legend>
          <div className="space-y-3">
            <Checkbox
              id="injury"
              required
              checked={form.injuryWaiver}
              onChange={v => set('injuryWaiver', v)}
              label="Injury Liability Waiver — I acknowledge the risks of physical activity and release 413 Youth Club and its staff from liability for injury during sessions."
            />
            <Checkbox
              id="refund"
              required
              checked={form.noRefundAck}
              onChange={v => set('noRefundAck', v)}
              label="No Refund Policy — I understand that session packages are non-refundable. Make-up sessions will be offered for club-cancelled classes."
            />
            <Checkbox
              id="competing"
              required
              checked={form.competingAck}
              onChange={v => set('competingAck', v)}
              label="Session Window — I understand that all purchased sessions must be completed within the program window (7 weeks for the 5-session package; 9 weeks for the 7-session package). Sessions do not carry over beyond the window."
            />
            <Checkbox
              id="media"
              checked={form.mediaConsent}
              onChange={v => set('mediaConsent', v)}
              label="Media Consent — I give permission for my child to appear in photos/videos for promotional and social media use."
            />
          </div>
        </fieldset>

        <hr className="border-gray-100" />

        {/* Signature */}
        <fieldset>
          <legend className="text-sm font-semibold text-brand-navy mb-1 uppercase tracking-wide">Signature</legend>
          <p className="text-xs text-gray-400 mb-3">By entering your name and date, you agree to the terms above.</p>
          <div className="space-y-4">
            <Field label="Printed Name" required>
              <input
                type="text" required placeholder="Your full legal name"
                value={form.printedName} onChange={e => set('printedName', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Date" required>
              <input
                type="date" required
                value={form.signedDate} onChange={e => set('signedDate', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </fieldset>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

        <button
          type="submit"
          className="w-full py-3.5 rounded-full bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy/90 active:scale-95 transition-all"
        >
          Review Registration →
        </button>
      </form>
    </>
  )
}

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
