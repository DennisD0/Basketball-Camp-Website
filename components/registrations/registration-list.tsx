'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Registration } from '@prisma/client'

type Status = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

const PROGRAM_LABELS: Record<string, { label: string; cls: string }> = {
  // new keys
  basketball_5_sessions: { label: 'Basketball 5 Sessions · $150', cls: 'bg-brand-teal/10 text-brand-teal' },
  basketball_7_sessions: { label: 'Basketball 7 Sessions · $200', cls: 'bg-brand-teal/10 text-brand-teal' },
  basketball_drop_in:    { label: 'Basketball Drop-in · $32',     cls: 'bg-blue-50 text-blue-700' },
  volleyball_5_sessions: { label: 'Volleyball 5 Sessions · $150', cls: 'bg-purple-50 text-purple-700' },
  volleyball_7_sessions: { label: 'Volleyball 7 Sessions · $200', cls: 'bg-purple-50 text-purple-700' },
  volleyball_drop_in:    { label: 'Volleyball Drop-in · $32',     cls: 'bg-blue-50 text-blue-700' },
  // legacy keys
  basketball_early_bird:   { label: 'Basketball Early Bird · $350',  cls: 'bg-green-50 text-green-700' },
  basketball_memorial_day: { label: 'Basketball Best Deal · $300',   cls: 'bg-purple-50 text-purple-700' },
  basketball_regular:      { label: 'Basketball Standard · $400',    cls: 'bg-gray-100 text-gray-600' },
  volleyball_early_bird:   { label: 'Volleyball Early Bird · $350',  cls: 'bg-green-50 text-green-700' },
  volleyball_memorial_day: { label: 'Volleyball Best Deal · $300',   cls: 'bg-purple-50 text-purple-700' },
  volleyball_regular:      { label: 'Volleyball Standard · $400',    cls: 'bg-gray-100 text-gray-600' },
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'APPROVED' ? 'bg-green-50 text-green-700' :
    status === 'REJECTED' ? 'bg-red-50 text-red-500' :
                            'bg-amber-50 text-amber-700'
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>
      {status[0] + status.slice(1).toLowerCase()}
    </span>
  )
}

function ActionButtons({ id, onDone }: { id: string; onDone: (memberId: string | null) => void }) {
  const [loading, setLoading] = useState<string | null>(null)

  async function update(status: 'APPROVED' | 'REJECTED') {
    setLoading(status)
    const res = await fetch(`/api/registrations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    setLoading(null)
    onDone(status === 'APPROVED' ? data.memberId : null)
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => update('APPROVED')}
        disabled={!!loading}
        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-green-50 text-green-700 rounded-full hover:bg-green-100 active:scale-95 transition-all disabled:opacity-50"
      >
        {loading === 'APPROVED' ? (
          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
          </svg>
        ) : '✓'} Approve
      </button>
      <button
        onClick={() => update('REJECTED')}
        disabled={!!loading}
        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-red-50 text-red-500 rounded-full hover:bg-red-100 active:scale-95 transition-all disabled:opacity-50"
      >
        {loading === 'REJECTED' ? (
          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/>
          </svg>
        ) : '✕'} Reject
      </button>
    </div>
  )
}

function RegistrationCard({ r, onRefresh }: { r: Registration; onRefresh: () => void }) {
  const [result, setResult] = useState<{ approved: boolean; memberId: string | null } | null>(null)
  const prog = PROGRAM_LABELS[r.programOption] ?? { label: r.programOption, cls: 'bg-gray-100 text-gray-600' }

  function handleDone(memberId: string | null) {
    setResult({ approved: memberId !== null, memberId })
    onRefresh()
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm ring-1 transition-all duration-300 ${
      result ? (result.approved ? 'ring-green-200' : 'ring-red-200') : 'ring-black/5'
    } p-5 flex flex-col gap-4`}>

      {/* Success flash */}
      {result && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between gap-3 ${
          result.approved ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
        }`}>
          <span>{result.approved ? '✓ Approved — member created!' : '✕ Registration rejected'}</span>
          {result.approved && result.memberId && (
            <a href={`/members/${result.memberId}`} className="underline text-xs font-semibold">
              View profile →
            </a>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-brand-navy">{r.childName}</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-teal/10 text-brand-teal font-medium">
              {r.ageGroup} {r.sport}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prog.cls}`}>
              {prog.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Parent: <span className="font-medium text-gray-700">{r.parentName}</span>
            {' · '}{r.parentPhone}
            {r.whatsappConsent && <span className="ml-1.5 text-green-600 font-medium">WhatsApp ✓</span>}
          </p>
        </div>
        {r.status !== 'PENDING' && <StatusBadge status={r.status} />}
      </div>

      {/* Consents */}
      <div className="flex gap-3 flex-wrap text-xs">
        <Consent ok={r.mediaConsent}  label="Media consent" />
        <Consent ok={r.injuryWaiver}  label="Injury waiver" />
        <Consent ok={r.noRefundAck}   label="No-refund ack" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <span className="text-xs text-gray-400">
          {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        {r.status === 'PENDING' && !result ? (
          <ActionButtons id={r.id} onDone={handleDone} />
        ) : (r.status === 'APPROVED' || result?.approved) ? (
          <Link
            href={`/contract/${r.id}`}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 active:scale-95 transition-all ring-1 ring-black/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            Preview Contract
          </Link>
        ) : null}
      </div>
    </div>
  )
}

function Consent({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
      ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'
    }`}>
      {ok ? '✓' : '✕'} {label}
    </span>
  )
}

export default function RegistrationList({ registrations }: { registrations: Registration[] }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Status>('PENDING')

  const counts: Record<Status, number> = {
    ALL:      registrations.length,
    PENDING:  registrations.filter(r => r.status === 'PENDING').length,
    APPROVED: registrations.filter(r => r.status === 'APPROVED').length,
    REJECTED: registrations.filter(r => r.status === 'REJECTED').length,
  }

  const filtered = activeTab === 'ALL'
    ? registrations
    : registrations.filter(r => r.status === activeTab)

  const tabs: { key: Status; label: string; cls: string }[] = [
    { key: 'PENDING',  label: 'Pending',  cls: 'bg-amber-50 text-amber-700' },
    { key: 'APPROVED', label: 'Approved', cls: 'bg-green-50 text-green-700' },
    { key: 'REJECTED', label: 'Rejected', cls: 'bg-red-50 text-red-500' },
    { key: 'ALL',      label: 'All',      cls: 'bg-gray-100 text-gray-600' },
  ]

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === t.key
                ? 'bg-brand-navy text-white shadow-sm'
                : 'bg-white text-gray-500 ring-1 ring-black/10 hover:bg-gray-50'
            }`}
          >
            {t.label}
            <span className={`ml-1.5 text-xs ${activeTab === t.key ? 'opacity-70' : 'text-gray-400'}`}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm ring-1 ring-black/5">
          No {activeTab.toLowerCase()} registrations.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(r => (
            <RegistrationCard key={r.id} r={r} onRefresh={() => router.refresh()} />
          ))}
        </div>
      )}
    </div>
  )
}
