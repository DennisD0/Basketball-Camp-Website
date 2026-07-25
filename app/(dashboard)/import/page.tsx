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
  const [fileResults, setFileResults] = useState<{ name: string; result: ParseResult }[]>([])
  const [status, setStatus] = useState<'idle' | 'importing' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ membersCreated: number; membersUpdated: number; membersSkipped: number; attendanceCreated: number; attendanceSkipped: number } | null>(null)
  const [importError, setImportError] = useState('')
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetStatus, setResetStatus] = useState<'idle' | 'deleting' | 'done' | 'error'>('idle')

  // Delete by period
  const [periodMode, setPeriodMode] = useState<'month' | 'date'>('month')
  const [periodValue, setPeriodValue] = useState('')
  const [periodPreview, setPeriodPreview] = useState<{ sessions: number; attendance: number } | null>(null)
  const [periodPreviewStatus, setPeriodPreviewStatus] = useState<'idle' | 'loading' | 'loaded' | 'empty' | 'error'>('idle')
  const [showPeriodModal, setShowPeriodModal] = useState(false)
  const [periodDeleteStatus, setPeriodDeleteStatus] = useState<'idle' | 'deleting' | 'error'>('idle')

  function readFile(file: File, yr: number): Promise<{ name: string; result: ParseResult }> {
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = e => resolve({ name: file.name, result: parseAttendanceCSV(e.target?.result as string, yr) })
      reader.readAsText(file)
    })
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setStatus('idle')
    setResult(null)
    const results = await Promise.all(Array.from(files).map(f => readFile(f, year)))
    setFileResults(results)
  }

  async function reparse(newYear: number) {
    setYear(newYear)
    if (!fileRef.current?.files?.length) return
    const results = await Promise.all(Array.from(fileRef.current.files).map(f => readFile(f, newYear)))
    setFileResults(results)
  }

  // Merge all files into one unified import payload, deduplicating members
  function mergeResults() {
    const memberMap = new Map<string, ParsedMember>()
    for (const { result } of fileResults) {
      for (const m of result.members) {
        const key = m.name.toLowerCase()
        if (memberMap.has(key)) {
          const existing = memberMap.get(key)!
          for (const d of m.attendanceDates) {
            if (!existing.attendanceDates.includes(d)) existing.attendanceDates.push(d)
          }
        } else {
          memberMap.set(key, { ...m })
        }
      }
    }
    return Array.from(memberMap.values())
  }

  async function handleImport() {
    const merged = mergeResults()
    if (merged.length === 0) return
    setStatus('importing')
    setImportError('')

    const members = merged.map(m => ({
      firstName: m.firstName,
      lastName: m.lastName,
      teamAssignment: m.classLabel,
    }))
    const attendance = merged.flatMap(m =>
      m.attendanceDates.map(date => ({ memberKey: `${m.firstName} ${m.lastName}`.trim(), date }))
    )

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members, attendance }),
      })
      let data: { error?: string; membersCreated?: number; membersUpdated?: number; membersSkipped?: number; attendanceCreated?: number; attendanceSkipped?: number } = {}
      try { data = await res.json() } catch { /* empty body — likely a timeout */ }
      if (!res.ok) { setImportError(data.error ?? 'Import failed — the request may have timed out.'); setStatus('error'); return }
      setResult({ membersCreated: data.membersCreated ?? 0, membersUpdated: data.membersUpdated ?? 0, membersSkipped: data.membersSkipped ?? 0, attendanceCreated: data.attendanceCreated ?? 0, attendanceSkipped: data.attendanceSkipped ?? 0 })
      setStatus('done')
    } catch (e) {
      setImportError(String(e))
      setStatus('error')
    }
  }

  async function handlePeriodPreview() {
    if (!periodValue) return
    setPeriodPreviewStatus('loading')
    setPeriodPreview(null)
    try {
      const param = periodMode === 'month' ? `month=${periodValue}` : `date=${periodValue}`
      const res = await fetch(`/api/attendance?${param}`)
      const data = await res.json()
      // GET returns either { dates: [...] } for month or { sessions: [...] } for date
      const sessionCount: number = (data.dates ?? data.sessions ?? []).length
      if (sessionCount === 0) { setPeriodPreviewStatus('empty'); return }
      setPeriodPreview({ sessions: sessionCount, attendance: -1 })
      setPeriodPreviewStatus('loaded')
    } catch {
      setPeriodPreviewStatus('error')
    }
  }

  async function handlePeriodDelete() {
    if (!periodValue) return
    setPeriodDeleteStatus('deleting')
    try {
      const param = periodMode === 'month' ? `month=${periodValue}` : `date=${periodValue}`
      const res = await fetch(`/api/attendance?${param}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { setPeriodDeleteStatus('error'); return }
      setShowPeriodModal(false)
      setPeriodPreview({ sessions: data.sessionsDeleted, attendance: data.attendanceDeleted })
      setPeriodPreviewStatus('loaded')
      setPeriodValue('')
      setPeriodDeleteStatus('idle')
    } catch {
      setPeriodDeleteStatus('error')
    }
  }

  async function handleReset() {
    setResetStatus('deleting')
    try {
      const res = await fetch('/api/import', { method: 'DELETE' })
      if (!res.ok) { setResetStatus('error'); return }
      setResetStatus('done')
      setShowResetModal(false)
      setFileResults([])
      setStatus('idle')
      setResult(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      setResetStatus('error')
    }
  }

  const merged = mergeResults()
  const allErrors = fileResults.flatMap(f => f.result.errors.map(e => `${f.name}: ${e}`))
  const totalAttendance = merged.reduce((s, m) => s + m.attendanceDates.length, 0)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-condensed font-bold text-2xl text-brand-navy tracking-wide">Import from Google Sheets</h1>
          <p className="text-sm text-gray-500 mt-1">
            Export each class CSV (File → Download → CSV) and upload them all at once — multiple files are merged automatically.
          </p>
        </div>
        <button
          onClick={() => { setShowResetModal(true); setResetStatus('idle') }}
          className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-all active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
          Reset All Data
        </button>
      </div>

      {/* Delete by Period */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 mb-4 overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-gray-50">
          <p className="text-sm font-semibold text-gray-800">Delete by Period</p>
          <p className="text-xs text-gray-400 mt-0.5">Remove all sessions and attendance records for a specific month or date.</p>
        </div>
        <div className="p-4 space-y-3">
          {/* Mode tabs */}
          <div className="flex gap-2">
            {(['month', 'date'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setPeriodMode(m); setPeriodValue(''); setPeriodPreview(null); setPeriodPreviewStatus('idle') }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  periodMode === m ? 'bg-brand-navy text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                By {m === 'month' ? 'Month' : 'Date'}
              </button>
            ))}
          </div>

          {/* Picker + preview button */}
          <div className="flex items-center gap-2">
            <input
              type={periodMode}
              value={periodValue}
              onChange={e => { setPeriodValue(e.target.value); setPeriodPreview(null); setPeriodPreviewStatus('idle') }}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
            />
            <button
              onClick={handlePeriodPreview}
              disabled={!periodValue || periodPreviewStatus === 'loading'}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all disabled:opacity-40"
            >
              {periodPreviewStatus === 'loading' ? 'Loading…' : 'Preview'}
            </button>
          </div>

          {/* Preview result */}
          {periodPreviewStatus === 'empty' && (
            <p className="text-xs text-gray-400">No sessions found for that {periodMode}.</p>
          )}
          {periodPreviewStatus === 'error' && (
            <p className="text-xs text-red-500">Could not load preview. Check your connection.</p>
          )}
          {periodPreviewStatus === 'loaded' && periodPreview && periodPreview.sessions > 0 && (
            <div className="flex items-center justify-between bg-red-50 rounded-xl px-3 py-2.5">
              <div>
                {periodPreview.attendance >= 0 ? (
                  <p className="text-xs font-semibold text-red-700">
                    Deleted {periodPreview.sessions} session{periodPreview.sessions !== 1 ? 's' : ''} · {periodPreview.attendance} attendance record{periodPreview.attendance !== 1 ? 's' : ''}
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-red-700">
                    {periodPreview.sessions} session{periodPreview.sessions !== 1 ? 's' : ''} will be deleted
                  </p>
                )}
                <p className="text-[11px] text-red-400 mt-0.5">All attendance records for these sessions will also be removed.</p>
              </div>
              {periodPreview.attendance < 0 && (
                <button
                  onClick={() => { setShowPeriodModal(true); setPeriodDeleteStatus('idle') }}
                  className="flex-shrink-0 ml-3 px-3 py-1.5 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all active:scale-95"
                >
                  Delete
                </button>
              )}
            </div>
          )}
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

      {/* Upload area — accepts multiple files */}
      <div
        className="bg-white rounded-2xl p-8 shadow-sm ring-1 ring-black/5 mb-6 text-center cursor-pointer hover:ring-brand-teal/40 transition-all"
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        <div className="w-14 h-14 rounded-2xl bg-brand-navy/5 flex items-center justify-center mx-auto mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-brand-navy/40">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>
        {fileResults.length === 0 ? (
          <>
            <p className="font-semibold text-brand-navy text-sm">Tap to upload CSV files</p>
            <p className="text-xs text-gray-400 mt-1">Select multiple files at once — or drag & drop them all here</p>
          </>
        ) : (
          <>
            <p className="font-semibold text-brand-navy text-sm">{fileResults.length} file{fileResults.length !== 1 ? 's' : ''} loaded</p>
            <div className="mt-2 space-y-0.5">
              {fileResults.map((f, i) => (
                <p key={i} className="text-xs text-gray-500">{f.name} · {f.result.members.length} students</p>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Tap to replace files</p>
          </>
        )}
      </div>

      {fileResults.length > 0 && (
        <>
          {allErrors.length > 0 && (
            <div className="bg-red-50 rounded-xl p-4 mb-4 text-sm text-red-600 space-y-1">
              {allErrors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          {merged.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5 mb-4">
              <h2 className="font-semibold text-brand-navy mb-3">Merged Preview</h2>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-brand-navy/5 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-brand-navy">{fileResults.length}</div>
                  <div className="text-xs text-gray-500 mt-0.5">CSV files</div>
                </div>
                <div className="bg-brand-navy/5 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-brand-navy">{merged.length}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Students</div>
                </div>
                <div className="bg-brand-teal/5 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-brand-teal">{totalAttendance}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Records</div>
                </div>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {merged.map((m, i) => (
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

          {merged.length > 0 && (
            <div className="space-y-3">
              {status === 'done' && result && (
                <div className="bg-green-50 rounded-xl p-4 text-sm text-green-700 space-y-1">
                  <p>✓ <strong>{result.membersCreated}</strong> new student{result.membersCreated !== 1 ? 's' : ''} added
                    {result.membersUpdated > 0 && <>, <strong>{result.membersUpdated}</strong> updated</>}
                    {result.membersSkipped > 0 && <>, <strong>{result.membersSkipped}</strong> skipped (already up to date)</>}
                    .
                  </p>
                  <p>✓ <strong>{result.attendanceCreated}</strong> attendance record{result.attendanceCreated !== 1 ? 's' : ''} imported
                    {result.attendanceSkipped > 0 && <>, <strong>{result.attendanceSkipped}</strong> duplicate{result.attendanceSkipped !== 1 ? 's' : ''} skipped</>}
                    .
                  </p>
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
                {status === 'importing' ? 'Importing…' : `Import ${merged.length} students + ${totalAttendance} records`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Period delete confirmation modal */}
      {showPeriodModal && periodPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => periodDeleteStatus !== 'deleting' && setShowPeriodModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-red-500">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h2 className="font-condensed font-bold text-xl text-brand-navy text-center mb-1">Delete period data?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will permanently delete <strong>{periodPreview.sessions} session{periodPreview.sessions !== 1 ? 's' : ''}</strong> and all their attendance records for{' '}
              <strong>{periodMode === 'month' ? periodValue : periodValue}</strong>. This cannot be undone.
            </p>
            {periodDeleteStatus === 'error' && (
              <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-4 text-center">Something went wrong. Please try again.</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPeriodModal(false)}
                disabled={periodDeleteStatus === 'deleting'}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePeriodDelete}
                disabled={periodDeleteStatus === 'deleting'}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50"
              >
                {periodDeleteStatus === 'deleting' ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset confirmation modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => resetStatus !== 'deleting' && setShowResetModal(false)}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-up">
            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-red-500">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h2 className="font-condensed font-bold text-xl text-brand-navy text-center mb-1">Reset all data?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will permanently delete all <strong>members</strong>, <strong>attendance records</strong>, <strong>sessions</strong>, and <strong>payments</strong>. Registrations are kept. This cannot be undone.
            </p>

            {resetStatus === 'error' && (
              <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-4 text-center">Something went wrong. Please try again.</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetStatus === 'deleting'}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetStatus === 'deleting'}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50"
              >
                {resetStatus === 'deleting' ? 'Deleting…' : 'Yes, delete everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
