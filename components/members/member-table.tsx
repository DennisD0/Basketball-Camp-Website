'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Member } from '@prisma/client'

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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function MemberCard({
  m,
  paid,
  onDeleteClick,
}: {
  m: Member
  paid: boolean
  onDeleteClick: () => void
}) {
  const initials = `${m.firstName[0] ?? ''}${m.lastName?.[0] ?? ''}`.toUpperCase()
  const grad = avatarGrad(m.firstName + m.lastName)

  return (
    <Link
      href={`/members/${m.id}`}
      className="group bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-4 flex items-center gap-3.5 hover:shadow-md hover:ring-brand-teal/20 active:scale-[0.99] transition-all duration-150"
    >
      {/* Avatar */}
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center font-bold text-sm text-white flex-shrink-0 shadow-sm`}>
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-condensed font-bold text-brand-navy text-base leading-tight truncate">
          {m.firstName} {m.lastName}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {m.teamAssignment && (
            <span className="text-[10px] font-semibold bg-brand-teal/10 text-brand-teal px-2 py-0.5 rounded-full">
              {m.teamAssignment}
            </span>
          )}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            paid ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {paid ? 'Paid' : 'Unpaid'}
          </span>
        </div>
        {m.guardianName && (
          <p className="text-[11px] text-gray-400 mt-1 truncate">{m.guardianName}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Link
          href={`/members/${m.id}/edit`}
          onClick={e => e.stopPropagation()}
          className="text-[11px] font-semibold text-gray-400 hover:text-brand-navy px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Edit
        </Link>
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onDeleteClick() }}
          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Delete member"
        >
          <TrashIcon />
        </button>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-300">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  )
}

export default function MemberTable({ members, paidMemberIds = [] }: { members: Member[]; paidMemberIds?: string[] }) {
  const paidSet = new Set(paidMemberIds)
  const teams = ['All', ...Array.from(new Set(members.map(m => m.teamAssignment).filter(Boolean) as string[])).sort()]
  const [activeTab, setActiveTab] = useState('All')
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null)
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'deleting' | 'error'>('idle')

  const visible = members.filter(m => !deletedIds.has(m.id))
  const filtered = activeTab === 'All' ? visible : visible.filter(m => m.teamAssignment === activeTab)

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

  if (visible.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-sm ring-1 ring-black/5">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7 text-gray-300">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium text-sm">No members yet</p>
        <Link href="/members/new" className="text-brand-teal text-sm font-semibold hover:underline mt-1 inline-block">
          Add the first one →
        </Link>
      </div>
    )
  }

  const unpaidCount = visible.filter(m => !paidSet.has(m.id)).length

  return (
    <>
      <div className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 shadow-sm ring-1 ring-black/5 text-center">
            <p className="font-condensed font-bold text-2xl text-brand-navy">{visible.length}</p>
            <p className="text-[11px] text-gray-400 font-medium">Active</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm ring-1 ring-black/5 text-center">
            <p className="font-condensed font-bold text-2xl text-brand-teal">{visible.length - unpaidCount}</p>
            <p className="text-[11px] text-gray-400 font-medium">Paid</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm ring-1 ring-black/5 text-center">
            <p className="font-condensed font-bold text-2xl text-amber-500">{unpaidCount}</p>
            <p className="text-[11px] text-gray-400 font-medium">Unpaid</p>
          </div>
        </div>

        {/* Team filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {teams.map(tab => {
            const count = tab === 'All' ? visible.length : visible.filter(m => m.teamAssignment === tab).length
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
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
        <div className="space-y-2">
          {filtered.map(m => (
            <MemberCard
              key={m.id}
              m={m}
              paid={paidSet.has(m.id)}
              onDeleteClick={() => { setPendingDelete({ id: m.id, name: `${m.firstName} ${m.lastName}` }); setDeleteStatus('idle') }}
            />
          ))}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => deleteStatus !== 'deleting' && setPendingDelete(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-red-500">
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
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteStatus === 'deleting'}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50"
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
