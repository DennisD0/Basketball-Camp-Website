'use client'

import { useState, useRef } from 'react'

interface ParsedMember {
  name: string
  firstName: string
  lastName: string
  classLabel: string // e.g. "Friday 4pm"
  attendanceDates: string[] // YYYY-MM-DD
}

interface ParseResult {
  members: ParsedMember[]
  errors: string[]
}

function cleanName(raw: string): string {
  return raw
    .replace(/\s*\(.*?\)\s*/g, '') // strip "(2 pm)" etc.
    .trim()
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/)
  return { firstName: parts[0] ?? full, lastName: parts.slice(1).join(' ') }
}

function parseDate(cell: string, year: number): string | null {
  // Handles "3/20", "3/31", "7/10" etc.
  const m = cell.trim().match(/^(\d{1,2})\/(\d{1,2})$/)
  if (!m) return null
  const month = m[1].padStart(2, '0')
  const day = m[2].padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseAttendanceCSV(text: string, year: number): ParseResult {
  const lines = text.split(/\r?\n/)
  const members: ParsedMember[] = []
  const errors: string[] = []
  const seen = new Map<string, ParsedMember>() // name.toLowerCase() → member

  let currentDay = ''
  let currentTime = ''
  let dateCols: { col: number; date: string }[] = []
  let inStudentSection = false

  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim())
    const nonEmpty = cells.filter(Boolean)

    // Detect day row (e.g. "Friday", "Tuesday", "Saturday")
    if (nonEmpty.length === 1 && /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(nonEmpty[0])) {
      currentDay = nonEmpty[0]
      currentTime = ''
      inStudentSection = false
      continue
    }

    // Detect class time row (e.g. "4pm class", "5pm class", "2:00 PM")
    if (nonEmpty.length === 1 && /\d+\s*(am|pm)/i.test(nonEmpty[0])) {
      currentTime = nonEmpty[0].replace(/\s*class\s*/i, '').trim()
      inStudentSection = false
      continue
    }

    // Detect header row with "Name" column
    const nameColIdx = cells.findIndex(c => c.toLowerCase() === 'name')
    if (nameColIdx !== -1) {
      dateCols = []
      for (let j = nameColIdx + 1; j < cells.length; j++) {
        const parsed = parseDate(cells[j], year)
        if (parsed) dateCols.push({ col: j, date: parsed })
      }
      inStudentSection = true
      continue
    }

    // Blank row or row without a name column resets section
    if (!inStudentSection) continue
    if (nonEmpty.length === 0) {
      inStudentSection = false
      continue
    }

    // Student row: first col is number, second is name
    const rawName = cells[1] ?? ''
    if (!rawName.trim() || /^\d+$/.test(rawName.trim())) continue

    const name = cleanName(rawName)
    if (!name) continue

    const classLabel = [currentDay, currentTime].filter(Boolean).join(' ')

    // Collect attended dates
    const attendanceDates: string[] = []
    for (const { col, date } of dateCols) {
      if ((cells[col] ?? '').toLowerCase() === 'present') {
        attendanceDates.push(date)
      }
    }

    const key = name.toLowerCase()
    if (seen.has(key)) {
      // Merge: add new attendance dates and update class if different
      const existing = seen.get(key)!
      for (const d of attendanceDates) {
        if (!existing.attendanceDates.includes(d)) existing.attendanceDates.push(d)
      }
    } else {
      const { firstName, lastName } = splitName(name)
      const member: ParsedMember = { name, firstName, lastName, classLabel, attendanceDates }
      seen.set(key, member)
      members.push(member)
    }
  }

  if (members.length === 0) errors.push('No students found — make sure the CSV matches the expected format.')
  return { members, errors }
}

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState<'idle' | 'importing' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ membersCreated: number; membersUpdated: number; attendanceCreated: number } | null>(null)
  const [importError, setImportError] = useState('')

  function handleFile(file: File) {
    setFileName(file.name)
    setStatus('idle')
    setResult(null)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      setParsed(parseAttendanceCSV(text, year))
    }
    reader.readAsText(file)
  }

  function reparse(newYear: number) {
    setYear(newYear)
    if (!fileRef.current?.files?.[0]) return
    const reader = new FileReader()
    reader.onload = e => setParsed(parseAttendanceCSV(e.target?.result as string, newYear))
    reader.readAsText(fileRef.current.files[0])
  }

  async function handleImport() {
    if (!parsed) return
    setStatus('importing')
    setImportError('')

    const members = parsed.members.map(m => ({
      firstName: m.firstName,
      lastName: m.lastName,
      teamAssignment: m.classLabel,
    }))

    const attendance = parsed.members.flatMap(m =>
      m.attendanceDates.map(date => ({ memberKey: `${m.firstName} ${m.lastName}`.trim(), date }))
    )

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members, attendance }),
      })
      const data = await res.json()
      if (!res.ok) { setImportError(data.error ?? 'Import failed'); setStatus('error'); return }
      setResult(data)
      setStatus('done')
    } catch (e) {
      setImportError(String(e))
      setStatus('error')
    }
  }

  const totalAttendance = parsed?.members.reduce((s, m) => s + m.attendanceDates.length, 0) ?? 0

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-condensed font-bold text-2xl text-brand-navy tracking-wide">Import from Google Sheets</h1>
        <p className="text-sm text-gray-500 mt-1">
          Export your check-in sheet as CSV (File → Download → CSV), then upload it here.
        </p>
      </div>

      {/* Year selector */}
      <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-black/5 mb-4 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Year of dates</label>
        <select
          value={year}
          onChange={e => reparse(Number(e.target.value))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
        >
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <p className="text-xs text-gray-400">The sheet uses M/DD format — pick the year to assign correct dates.</p>
      </div>

      {/* Upload area */}
      <div
        className="bg-white rounded-2xl p-8 shadow-sm ring-1 ring-black/5 mb-6 text-center cursor-pointer hover:ring-brand-teal/40 transition-all active:scale-98"
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
        />
        <div className="w-14 h-14 rounded-2xl bg-brand-navy/5 flex items-center justify-center mx-auto mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-navy/40">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>
        <p className="font-semibold text-brand-navy text-sm">{fileName || 'Tap to upload CSV'}</p>
        <p className="text-xs text-gray-400 mt-1">
          {fileName ? 'Tap to replace file' : 'Or drag & drop your exported CSV here'}
        </p>
      </div>

      {parsed && (
        <>
          {/* Parse errors */}
          {parsed.errors.length > 0 && (
            <div className="bg-red-50 rounded-xl p-4 mb-4 text-sm text-red-600">
              {parsed.errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          {/* Summary */}
          {parsed.members.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5 mb-4">
              <h2 className="font-semibold text-brand-navy mb-3">Preview</h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-brand-navy/5 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-brand-navy">{parsed.members.length}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Students</div>
                </div>
                <div className="bg-brand-teal/5 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-brand-teal">{totalAttendance}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Attendance records</div>
                </div>
              </div>

              {/* Student list */}
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {parsed.members.map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.classLabel}</p>
                    </div>
                    <span className="text-xs text-brand-teal font-semibold whitespace-nowrap flex-shrink-0">
                      {m.attendanceDates.length} sessions
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import button + result */}
          {parsed.members.length > 0 && (
            <div className="space-y-3">
              {status === 'done' && result && (
                <div className="bg-green-50 rounded-xl p-4 text-sm text-green-700">
                  ✓ <strong>{result.membersCreated}</strong> new students added, <strong>{result.membersUpdated}</strong> updated, <strong>{result.attendanceCreated}</strong> attendance records imported.
                </div>
              )}
              {status === 'error' && (
                <div className="bg-red-50 rounded-xl p-4 text-sm text-red-600">{importError}</div>
              )}
              <button
                onClick={handleImport}
                disabled={status === 'importing'}
                className="w-full py-3.5 bg-brand-navy text-white rounded-2xl text-sm font-semibold hover:bg-brand-navy/90 active:scale-95 transition-all disabled:opacity-50"
              >
                {status === 'importing' ? 'Importing…' : `Import ${parsed.members.length} students + ${totalAttendance} records`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
