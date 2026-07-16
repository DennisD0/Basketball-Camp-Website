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

function MemberCard({ m, paid }: { m: Member; paid: boolean }) {
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

      {/* Edit button + chevron */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Link
          href={`/members/${m.id}/edit`}
          onClick={e => e.stopPropagation()}
          className="text-[11px] font-semibold text-gray-400 hover:text-brand-navy px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Edit
        </Link>
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
  const filtered = activeTab === 'All' ? members : members.filter(m => m.teamAssignment === activeTab)

  if (members.length === 0) {
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

  const unpaidCount = members.filter(m => !paidSet.has(m.id)).length

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm ring-1 ring-black/5 text-center">
          <p className="font-condensed font-bold text-2xl text-brand-navy">{members.length}</p>
          <p className="text-[11px] text-gray-400 font-medium">Active</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm ring-1 ring-black/5 text-center">
          <p className="font-condensed font-bold text-2xl text-brand-teal">{members.length - unpaidCount}</p>
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
          const count = tab === 'All' ? members.length : members.filter(m => m.teamAssignment === tab).length
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
          <MemberCard key={m.id} m={m} paid={paidSet.has(m.id)} />
        ))}
      </div>
    </div>
  )
}
