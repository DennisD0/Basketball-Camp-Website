'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Member } from '@prisma/client'

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

function ageFromDob(dob: Date | null) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

function sportColor(team: string | null) {
  if (!team) return { bg: 'bg-gray-300', text: 'text-white', badge: 'bg-gray-100 text-gray-600' }
  if (team.toLowerCase().includes('basketball'))
    return { bg: 'bg-brand-navy', text: 'text-white', badge: 'bg-brand-navy/10 text-brand-navy' }
  if (team.toLowerCase().includes('volleyball'))
    return { bg: 'bg-brand-teal', text: 'text-white', badge: 'bg-brand-teal/10 text-brand-teal' }
  return { bg: 'bg-gray-400', text: 'text-white', badge: 'bg-gray-100 text-gray-600' }
}

function MemberCard({ m, paid }: { m: Member; paid: boolean }) {
  const age = ageFromDob(m.dateOfBirth)
  const colors = sportColor(m.teamAssignment)

  return (
    <Link
      href={`/members/${m.id}`}
      className="group bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 flex flex-col gap-4
                 hover:-translate-y-1 hover:shadow-md transition-all duration-200"
    >
      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${colors.bg} ${colors.text}`}>
          {initials(m.firstName, m.lastName)}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-brand-navy leading-tight truncate">
            {m.firstName} {m.lastName}
          </p>
          {age !== null && (
            <p className="text-xs text-gray-400">Age {age}</p>
          )}
        </div>
      </div>

      {/* Team badge + payment status */}
      <div className="flex items-center gap-2 flex-wrap">
        {m.teamAssignment && (
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors.badge}`}>
            {m.teamAssignment}
          </span>
        )}
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          paid ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
        }`}>
          {paid ? 'Paid' : 'Unpaid'}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-xs text-gray-500 border-t border-gray-50 pt-3">
        {m.guardianName && (
          <div className="flex items-center gap-1.5">
            <IconPerson />
            <span className="truncate">{m.guardianName}</span>
          </div>
        )}
        {m.guardianPhone && (
          <div className="flex items-center gap-1.5">
            <IconPhone />
            <span>{m.guardianPhone}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <IconCalendar />
          <span>Enrolled {new Date(m.enrollmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <span className="flex-1 text-center text-xs font-medium py-1.5 rounded-full bg-brand-navy/5 text-brand-navy group-hover:bg-brand-navy group-hover:text-white transition-colors">
          View
        </span>
        <Link
          href={`/members/${m.id}/edit`}
          onClick={e => e.stopPropagation()}
          className="flex-1 text-center text-xs font-medium py-1.5 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Edit
        </Link>
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
      <div className="bg-white rounded-2xl p-12 text-center text-gray-400">
        No members yet.{' '}
        <Link href="/members/new" className="text-brand-navy underline">
          Add the first one.
        </Link>
      </div>
    )
  }

  const bballCount = members.filter(m => m.teamAssignment?.includes('Basketball')).length
  const vballCount = members.filter(m => m.teamAssignment?.includes('Volleyball')).length

  return (
    <div className="space-y-5">
      {/* Quick sport breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm ring-1 ring-black/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-navy/10 flex items-center justify-center">
            <IconBall className="text-brand-navy" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Basketball</p>
            <p className="font-bold text-brand-navy">{bballCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm ring-1 ring-black/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-teal/10 flex items-center justify-center">
            <IconVball className="text-brand-teal" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Volleyball</p>
            <p className="font-bold text-brand-teal">{vballCount}</p>
          </div>
        </div>
      </div>

      {/* Team filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {teams.map(tab => {
          const count = tab === 'All' ? members.length : members.filter(m => m.teamAssignment === tab).length
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'bg-white text-gray-500 ring-1 ring-black/10 hover:bg-gray-50'
              }`}
            >
              {tab} <span className={`ml-1 text-xs ${activeTab === tab ? 'opacity-70' : 'text-gray-400'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(m => (
          <MemberCard key={m.id} m={m} paid={paidSet.has(m.id)} />
        ))}
      </div>
    </div>
  )
}

// Icons
const IconPerson = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)
const IconPhone = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.13 6.13l.95-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconBall = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <circle cx="12" cy="12" r="10"/>
    <path d="M4.93 4.93c4.97 4.97 10.07 10.07 14.14 14.14"/>
    <path d="M9 3.5c0 5 6 9 6 9"/>
    <path d="M9 20.5c0-5 6-9 6-9"/>
  </svg>
)
const IconVball = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    <path d="M2 12h20"/>
  </svg>
)
