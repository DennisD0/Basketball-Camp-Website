'use client'

import { useState } from 'react'

type Template = 'absence' | 'payment' | 'custom'

const TEMPLATES: Record<Template, (player: string, guardian: string, team: string) => { subject: string; body: string }> = {
  absence: (player, guardian, team) => ({
    subject: `Attendance Notice — ${player}`,
    body: `Hi ${guardian},

I wanted to reach out regarding ${player}'s recent attendance in the ${team} program.

${player} has missed a few practices this month. Consistent attendance is important for player development and for keeping up with the rest of the group.

If there are any scheduling conflicts or concerns, please don't hesitate to reach out so we can work something out.

Looking forward to seeing ${player} at the next session.

Best regards,
413 Youth Club Coaching Staff`,
  }),
  payment: (player, guardian) => ({
    subject: `Payment Reminder — ${player}`,
    body: `Hi ${guardian},

This is a friendly reminder that a fee payment is currently outstanding for ${player}.

Monthly fee: $50
Accepted methods: Cash (at next session) or Bank Transfer

Zelle: 347-200-4439
(Please include your child's name in the memo.)

If you have any questions about your balance or payment options, please reply to this email.

Thank you,
413 Youth Club`,
  }),
  custom: () => ({
    subject: '',
    body: '',
  }),
}

export default function EmailParentButton({
  memberId,
  playerName,
  guardianName,
  guardianEmail,
  team,
}: {
  memberId: string
  playerName: string
  guardianName: string
  guardianEmail: string | null
  team: string | null
}) {
  const [open, setOpen] = useState(false)
  const [template, setTemplate] = useState<Template>('absence')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  function applyTemplate(t: Template) {
    setTemplate(t)
    setSent(false)
    setError('')
    const filled = TEMPLATES[t](playerName, guardianName || 'Parent/Guardian', team || 'the program')
    setSubject(filled.subject)
    setBody(filled.body)
  }

  function openModal() {
    applyTemplate('absence')
    setSent(false)
    setError('')
    setOpen(true)
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim()) {
      setError('Subject and message are required.')
      return
    }
    setSending(true)
    setError('')
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, type: template, subject, body }),
    })
    setSending(false)
    if (res.ok) {
      setSent(true)
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to send. Try again.')
    }
  }

  if (!guardianEmail) {
    return <p className="text-xs text-gray-400">No guardian email on file.</p>
  }

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-teal/10 text-brand-teal rounded-full hover:bg-brand-teal/20 transition-all"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        Email Parent
      </button>

      {/* Modal backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Compose Email</h2>
                <p className="text-xs text-gray-400 mt-0.5">To: {guardianName} &lt;{guardianEmail}&gt;</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* Template picker */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quick Templates</p>
                <div className="flex gap-2 flex-wrap">
                  {(['absence', 'payment', 'custom'] as Template[]).map(t => (
                    <button
                      key={t}
                      onClick={() => applyTemplate(t)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        template === t
                          ? t === 'absence'  ? 'bg-brand-orange text-white'
                          : t === 'payment'  ? 'bg-brand-teal text-white'
                                             : 'bg-brand-navy text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {t === 'absence' ? 'Absence Alert' : t === 'payment' ? 'Payment Reminder' : 'Custom'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Select a template to pre-fill, then edit as needed before sending.
                </p>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Email subject…"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/40"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Message
                </label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Write your message…"
                  rows={12}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/40 resize-none font-mono leading-relaxed"
                />
                <p className="text-xs text-gray-300 mt-1 text-right">{body.length} chars</p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}

              {sent && (
                <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Email sent to {guardianEmail}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setOpen(false)}
                className="px-5 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || sent}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-teal text-white text-sm font-semibold rounded-full hover:bg-brand-teal/90 transition-all disabled:opacity-60"
              >
                {sending ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                      <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"/>
                    </svg>
                    Sending…
                  </>
                ) : sent ? (
                  'Sent ✓'
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
