'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

interface Props {
  initialYear: number
  initialMonth: number
}

export default function AttendanceCalendar({ initialYear, initialMonth }: Props) {
  const router = useRouter()
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [sessionDates, setSessionDates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setDbError(false)
    const m = String(month).padStart(2, '0')
    fetch(`/api/attendance?month=${year}-${m}`)
      .then(r => { if (!r.ok) throw new Error('db'); return r.json() })
      .then(data => { setSessionDates(new Set(data.dates ?? [])); setLoading(false) })
      .catch(() => { setDbError(true); setLoading(false) })
  }, [year, month])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' })
  const firstDow = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const today = new Date().toISOString().slice(0, 10)

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function dateStr(day: number) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const sessionCount = sessionDates.size

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="text-center">
          <h2 className="font-condensed font-bold text-xl text-brand-navy tracking-wide uppercase">{monthName} {year}</h2>
          {!loading && !dbError && (
            <p className="text-xs text-gray-400 mt-0.5">
              {sessionCount === 0 ? 'No sessions recorded' : `${sessionCount} session${sessionCount !== 1 ? 's' : ''} this month`}
            </p>
          )}
        </div>
        <button
          onClick={nextMonth}
          aria-label="Next month"
          className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 px-3 pb-1">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-gray-400 tracking-wider py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="px-3 pb-5">
        {loading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl skeleton opacity-40" />
            ))}
          </div>
        ) : dbError ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-gray-300">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-sm">Database not connected</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const ds = dateStr(day)
              const hasSession = sessionDates.has(ds)
              const isToday = ds === today
              return (
                <button
                  key={i}
                  onClick={() => router.push(`/attendance/${ds}?tab=take`)}
                  className={[
                    'relative aspect-square flex flex-col items-center justify-center rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-95 cursor-pointer',
                    isToday ? 'ring-2 ring-brand-navy ring-offset-1' : '',
                    hasSession
                      ? 'bg-brand-teal text-white shadow-sm hover:bg-brand-teal/90'
                      : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100',
                  ].join(' ')}
                >
                  {day}
                  {hasSession && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-white/50" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 px-5 pb-4 border-t border-gray-50 pt-3">
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-3 h-3 rounded-md bg-brand-teal inline-block" />
          Session recorded
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-3 h-3 rounded-md ring-2 ring-brand-navy inline-block" />
          Today
        </span>
      </div>
    </div>
  )
}
