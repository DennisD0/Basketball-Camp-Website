'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Member } from '@prisma/client'
import { asLocalDate } from '@/lib/dates'
import { daysUntil } from '@/lib/sessions'

/** A member's package figures, serialized by the server page. */
export type MemberSessions = {
  total: number
  used: number
  remaining: number
  /** ISO — the day the package started, i.e. when their registration runs from. */
  startDate: string | null
  /** ISO — the day the sessions must be used by. Null for a drop-in. */
  expiresOn: string | null
}

function shortDate(iso: string): string {
  return asLocalDate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const AVATAR_GRADS = [
  'from-brand-navy to-brand-teal',
  'from-purple-600 to-indigo-500',
  'from-emerald-600 to-teal-500',
  'from-blue-600 to-cyan-500',
  'from-rose-600 to-pink-500',
  'from-amber-600 to-orange-500',
]
function avatarGrad(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return AVATAR_GRADS[Math.abs(h) % AVATAR_GRADS.length]
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

/**
 * Sessions left, when the package started and when it runs out.
 *
 * The dates are the point: a coach looking at the roster needs to see that a
 * student has three sessions left AND nine days to use them, without opening
 * the profile. Expiry is derived in lib/sessions.ts from the package total —
 * 5 sessions run 7 weeks, 7 run 9 — so it is never stored twice.
 */
function SessionLine({ s }: { s: MemberSessions }) {
  const days = s.expiresOn ? daysUntil(new Date(s.expiresOn)) : null
  const expired = days !== null && days < 0
  const soon = days !== null && days >= 0 && days <= 14

  return (
    <p className="text-[11px] mt-1">
      <span className={`font-semibold ${
        s.remaining === 0 ? 'text-red-500' : s.remaining <= 2 ? 'text-orange-500' : 'text-brand-teal'
      }`}>
        {s.remaining}/{s.total} left
      </span>
      {s.startDate && (
        <span className="text-gray-400"> · from {shortDate(s.startDate)}</span>
      )}
      {s.expiresOn ? (
        <span className={expired ? 'text-red-500 font-semibold' : soon ? 'text-orange-500 font-semibold' : 'text-gray-400'}>
          {expired ? ` · ended ${shortDate(s.expiresOn)}` : ` · use by ${shortDate(s.expiresOn)}`}
        </span>
      ) : (
        s.total <= 1 && <span className="text-gray-400"> · drop-in</span>
      )}
    </p>
  )
}

function MemberCard({
  m,
  paid,
  sessions,
  onDeleteClick,
}: {
  m: Member
  paid: boolean
  sessions?: MemberSessions
  onDeleteClick: () => void
}) {
  const router = useRouter()
  const initials = `${m.firstName[0] ?? ''}${m.lastName?.[0] ?? ''}`.toUpperCase()
  const grad = avatarGrad(m.firstName + m.lastName)

  return (
    <div
      onClick={() => router.push(`/members/${m.id}`)}
      className="group bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-3 sm:p-4 hover:shadow-md hover:ring-brand-teal/30 active:scale-[0.99] transition-all duration-150 cursor-pointer"
    >
      {/* Top row: who they are, and what you can do to them. On a phone the
          name and the two action buttons are all that competes for the width. */}
      <div className="flex items-start gap-3 sm:gap-4">
        <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center font-bold text-sm text-white flex-shrink-0 shadow-sm`}>
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-condensed font-bold text-brand-navy text-base leading-tight truncate">
            {m.firstName} {m.lastName}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {m.teamAssignment && (
              <span className="text-[10px] font-bold bg-brand-navy/8 text-brand-navy px-2 py-0.5 rounded-full uppercase tracking-wide max-w-full truncate">
                {m.teamAssignment}
              </span>
            )}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
              paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {paid ? 'Paid' : 'Unpaid'}
            </span>
          </div>
        </div>

        {/* Actions. The label collapses to a pencil on a phone — the words cost
            more width than the whole session line needs. Both stay 44px, the
            smallest thing a thumb can reliably hit. */}
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 -mr-1 sm:mr-0">
          <button
            onClick={e => { e.stopPropagation(); router.push(`/members/${m.id}/edit`) }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[11px] font-semibold text-gray-400 hover:text-brand-navy sm:px-2 rounded-xl hover:bg-gray-100 transition-colors"
            aria-label={`Edit ${m.firstName} ${m.lastName}`}
          >
            <span className="hidden sm:inline">Edit</span>
            <span className="sm:hidden"><PencilIcon /></span>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDeleteClick() }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            aria-label={`Delete ${m.firstName} ${m.lastName}`}
            title="Delete member"
          >
            <TrashIcon />
          </button>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="hidden sm:block w-4 h-4 text-gray-300 flex-shrink-0">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      {/* Sessions and guardian get the full width of the card. Squeezed into the
          column above they were truncated on a phone — which hid the one number
          a coach opens this page to read. Indented to the avatar on desktop. */}
      {(sessions || m.guardianName) && (
        <div className="mt-1.5 sm:mt-1 sm:pl-16">
          {sessions && <SessionLine s={sessions} />}
          {m.guardianName && (
            <p className="text-[11px] text-gray-400 mt-1 truncate">{m.guardianName}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function MemberTable({
  members,
  paidMemberIds = [],
  sessions = {},
}: {
  members: Member[]
  paidMemberIds?: string[]
  /** Keyed by member id. Absent for a member whose figures could not be read. */
  sessions?: Record<string, MemberSessions>
}) {
  const paidSet = new Set(paidMemberIds)
  const teams = ['All', ...Array.from(new Set(members.map(m => m.teamAssignment).filter(Boolean) as string[])).sort()]
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null)
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'deleting' | 'error'>('idle')

  const visible = members.filter(m => !deletedIds.has(m.id))
  const byTeam = activeTab === 'All' ? visible : visible.filter(m => m.teamAssignment === activeTab)
  const filtered = search.trim()
    ? byTeam.filter(m => `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()))
    : byTeam

  async function handleDelete() {
    if (!pendingDelete) return
    setDeleteStatus('deleting')
    try {
      const res = await fetch(`/api/members/${pendingDelete.id}?hard=true`, { method: 'DELETE' })
      if (!res.ok) { setDeleteStatus('error'); return }
      setDeletedIds(prev => new Set([...prev, pendingDelete.id]))
      setPendingDelete(null)
      setDeleteStatus('idle')
    } catch {
      setDeleteStatus('error')
    }
  }

  const unpaidCount = visible.filter(m => !paidSet.has(m.id)).length
  const paidCount = visible.length - unpaidCount

  if (visible.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-sm ring-1 ring-black/5">
        <div className="w-16 h-16 rounded-2xl bg-brand-navy/8 flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-brand-navy/40">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <p className="font-condensed font-bold text-lg text-brand-navy mb-1">No members yet</p>
        <p className="text-sm text-gray-400 mb-4">Add your first player to get started</p>
        <Link href="/members/new" className="inline-flex items-center gap-2 bg-brand-navy text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-brand-navy/90 transition-all active:scale-95">
          Add Member
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Bold colored stat blocks */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-brand-navy rounded-2xl p-4 text-center shadow-sm">
            <p className="font-condensed font-bold text-3xl text-white leading-none">{visible.length}</p>
            <p className="text-[10px] text-white/60 font-bold mt-1.5 uppercase tracking-wider">Active</p>
          </div>
          <div className="bg-brand-teal rounded-2xl p-4 text-center shadow-sm">
            <p className="font-condensed font-bold text-3xl text-white leading-none">{paidCount}</p>
            <p className="text-[10px] text-white/60 font-bold mt-1.5 uppercase tracking-wider">Paid</p>
          </div>
          <div className="bg-amber-500 rounded-2xl p-4 text-center shadow-sm">
            <p className="font-condensed font-bold text-3xl text-white leading-none">{unpaidCount}</p>
            <p className="text-[10px] text-white/60 font-bold mt-1.5 uppercase tracking-wider">Unpaid</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="Search members…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full min-h-[48px] pl-10 pr-4 bg-white rounded-xl ring-1 ring-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/50 transition-all"
          />
        </div>

        {/* Team filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {teams.map(tab => {
            const count = tab === 'All' ? visible.length : visible.filter(m => m.teamAssignment === tab).length
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 min-h-[44px] px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all duration-150 ${
                  activeTab === tab
                    ? 'bg-brand-navy text-white shadow-sm'
                    : 'bg-white text-gray-500 ring-1 ring-black/10 hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                {tab}
                <span className={`ml-1.5 ${activeTab === tab ? 'opacity-60' : 'text-gray-400'}`}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Member list */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center ring-1 ring-black/5">
            <p className="text-sm text-gray-400">No members match your search.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(m => (
              <MemberCard
                key={m.id}
                m={m}
                paid={paidSet.has(m.id)}
                sessions={sessions[m.id]}
                onDeleteClick={() => { setPendingDelete({ id: m.id, name: `${m.firstName} ${m.lastName}` }); setDeleteStatus('idle') }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal — slides up from bottom on mobile */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => deleteStatus !== 'deleting' && setPendingDelete(null)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-red-500">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h2 className="font-condensed font-bold text-xl text-brand-navy text-center mb-1">Delete profile?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              <strong>{pendingDelete.name}</strong> and all their attendance, payment, and notification records will be permanently deleted. This cannot be undone.
            </p>
            {deleteStatus === 'error' && (
              <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-4 text-center">Something went wrong. Please try again.</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setPendingDelete(null)}
                disabled={deleteStatus === 'deleting'}
                className="flex-1 min-h-[48px] rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteStatus === 'deleting'}
                className="flex-1 min-h-[48px] rounded-2xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50"
              >
                {deleteStatus === 'deleting' ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
