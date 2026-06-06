'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Link from 'next/link'

type Member = { id: string; firstName: string; lastName: string; teamAssignment: string | null }

const PERIODS = ['Last 2 Weeks', 'Last Month', 'Last 3 Months'] as const
type Period = typeof PERIODS[number]

const ALL_DATA = [
  { session: 'Oct 7',  'U12 Boys': 4, 'U14 Boys': 5, 'U16 Boys': 4 },
  { session: 'Oct 14', 'U12 Boys': 5, 'U14 Boys': 4, 'U16 Boys': 5 },
  { session: 'Oct 21', 'U12 Boys': 3, 'U14 Boys': 5, 'U16 Boys': 3 },
  { session: 'Oct 28', 'U12 Boys': 5, 'U14 Boys': 3, 'U16 Boys': 4 },
  { session: 'Nov 4',  'U12 Boys': 4, 'U14 Boys': 4, 'U16 Boys': 5 },
  { session: 'Nov 11', 'U12 Boys': 5, 'U14 Boys': 5, 'U16 Boys': 5 },
]

const DATA_BY_PERIOD: Record<Period, typeof ALL_DATA> = {
  'Last 2 Weeks':  ALL_DATA.slice(4),
  'Last Month':    ALL_DATA.slice(2),
  'Last 3 Months': ALL_DATA,
}

// Mock session detail — absent members by team (using seeded names)
const SESSION_DETAILS: Record<string, { date: string; teams: { name: string; present: string[]; absent: string[] }[] }> = {
  'Oct 7':  { date: 'Oct 7, 2025 — Practice', teams: [
    { name: 'U12 Boys', present: ['Marcus J.', 'Darius W.', 'Jaylen B.', 'Malik D.'],     absent: ['Isaiah T.'] },
    { name: 'U14 Boys', present: ['DeShawn C.', 'Trevon H.', 'Jordan M.', 'Elijah R.', 'Kofi M.'], absent: [] },
    { name: 'U16 Boys', present: ['Tyler W.', 'Antoine L.', 'Brandon S.', 'Jaylen A.'],  absent: ['Dominic P.'] },
  ]},
  'Oct 14': { date: 'Oct 14, 2025 — Practice', teams: [
    { name: 'U12 Boys', present: ['Marcus J.', 'Darius W.', 'Jaylen B.', 'Malik D.', 'Isaiah T.'], absent: [] },
    { name: 'U14 Boys', present: ['DeShawn C.', 'Jordan M.', 'Elijah R.', 'Kofi M.'],   absent: ['Trevon H.'] },
    { name: 'U16 Boys', present: ['Tyler W.', 'Antoine L.', 'Brandon S.', 'Dominic P.', 'Jaylen A.'], absent: [] },
  ]},
  'Oct 21': { date: 'Oct 21, 2025 — Practice', teams: [
    { name: 'U12 Boys', present: ['Marcus J.', 'Darius W.', 'Jaylen B.'],                absent: ['Malik D.', 'Isaiah T.'] },
    { name: 'U14 Boys', present: ['DeShawn C.', 'Trevon H.', 'Jordan M.', 'Elijah R.', 'Kofi M.'], absent: [] },
    { name: 'U16 Boys', present: ['Tyler W.', 'Brandon S.', 'Jaylen A.'],                absent: ['Antoine L.', 'Dominic P.'] },
  ]},
  'Oct 28': { date: 'Oct 28, 2025 — Practice', teams: [
    { name: 'U12 Boys', present: ['Marcus J.', 'Darius W.', 'Jaylen B.', 'Malik D.', 'Isaiah T.'], absent: [] },
    { name: 'U14 Boys', present: ['DeShawn C.', 'Trevon H.', 'Jordan M.'],              absent: ['Elijah R.', 'Kofi M.'] },
    { name: 'U16 Boys', present: ['Tyler W.', 'Antoine L.', 'Brandon S.', 'Jaylen A.'], absent: ['Dominic P.'] },
  ]},
  'Nov 4':  { date: 'Nov 4, 2025 — Practice', teams: [
    { name: 'U12 Boys', present: ['Marcus J.', 'Jaylen B.', 'Malik D.', 'Isaiah T.'],   absent: ['Darius W.'] },
    { name: 'U14 Boys', present: ['DeShawn C.', 'Trevon H.', 'Elijah R.', 'Kofi M.'],  absent: ['Jordan M.'] },
    { name: 'U16 Boys', present: ['Tyler W.', 'Antoine L.', 'Brandon S.', 'Dominic P.', 'Jaylen A.'], absent: [] },
  ]},
  'Nov 11': { date: 'Nov 11, 2025 — Practice', teams: [
    { name: 'U12 Boys', present: ['Marcus J.', 'Darius W.', 'Jaylen B.', 'Malik D.', 'Isaiah T.'], absent: [] },
    { name: 'U14 Boys', present: ['DeShawn C.', 'Trevon H.', 'Jordan M.', 'Elijah R.', 'Kofi M.'], absent: [] },
    { name: 'U16 Boys', present: ['Tyler W.', 'Antoine L.', 'Brandon S.', 'Dominic P.', 'Jaylen A.'], absent: [] },
  ]},
}

export default function AttendanceChart({ members }: { members: Member[] }) {
  const [period, setPeriod] = useState<Period>('Last 3 Months')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<string | null>(null)

  const data = DATA_BY_PERIOD[period]
  const detail = selectedSession ? SESSION_DETAILS[selectedSession] : null

  function handleChartClick(payload: any) {
    const session = payload?.activeLabel
    if (!session) return
    setSelectedSession((prev) => (prev === session ? null : session))
  }

  function memberLink(displayName: string): string | null {
    const parts = displayName.replace('.', '').split(' ')
    const first = parts[0]
    const lastInitial = parts[1]
    const found = members.find(
      (m) =>
        m.firstName.toLowerCase() === first.toLowerCase() &&
        m.lastName.toLowerCase().startsWith(lastInitial.toLowerCase())
    )
    return found ? `/members/${found.id}` : null
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden">
      <div className="p-6 pb-2">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-semibold text-gray-800">Practice Attendance</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Click a bar to see who attended · {selectedSession ? `showing ${selectedSession}` : 'no session selected'}
            </p>
          </div>

          {/* Period dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors font-medium"
            >
              {period}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg ring-1 ring-black/10 py-1 z-20 min-w-[150px]">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPeriod(p); setDropdownOpen(false); setSelectedSession(null) }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      p === period ? 'text-brand-teal font-semibold' : 'text-gray-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            barGap={3}
            barCategoryGap="30%"
            onClick={handleChartClick}
            style={{ cursor: 'pointer' }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="session" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontSize: '12px' }}
              cursor={{ fill: '#f9fafb' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px', paddingBottom: '8px' }} />
            <Bar dataKey="U12 Boys" fill="#2D3875" radius={[4, 4, 0, 0]} />
            <Bar dataKey="U14 Boys" fill="#2C6E6A" radius={[4, 4, 0, 0]} />
            <Bar dataKey="U16 Boys" fill="#C85A1E" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Session detail panel */}
      {detail && (
        <div className="border-t border-gray-100 bg-[#F4F2EE] px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-700">{detail.date}</p>
              <p className="text-xs text-gray-400 mt-0.5">Click a name to view their profile</p>
            </div>
            <button
              onClick={() => setSelectedSession(null)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-lg hover:bg-white"
            >
              ✕ Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {detail.teams.map((team) => (
              <div key={team.name} className="bg-white rounded-xl p-4 ring-1 ring-black/5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{team.name}</p>
                <div className="space-y-2">
                  {team.present.map((name) => {
                    const href = memberLink(name)
                    return href ? (
                      <Link key={name} href={href} className="flex items-center gap-2 group">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-teal flex-shrink-0" />
                        <span className="text-sm text-gray-700 group-hover:text-brand-navy group-hover:underline transition-colors">
                          {name}
                        </span>
                      </Link>
                    ) : (
                      <div key={name} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-teal flex-shrink-0" />
                        <span className="text-sm text-gray-700">{name}</span>
                      </div>
                    )
                  })}
                  {team.absent.map((name) => {
                    const href = memberLink(name)
                    return href ? (
                      <Link key={name} href={href} className="flex items-center gap-2 group">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-orange flex-shrink-0" />
                        <span className="text-sm text-gray-400 group-hover:text-brand-orange group-hover:underline transition-colors">
                          {name} <span className="text-xs">(absent)</span>
                        </span>
                      </Link>
                    ) : (
                      <div key={name} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-orange flex-shrink-0" />
                        <span className="text-sm text-gray-400">{name} <span className="text-xs">(absent)</span></span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
