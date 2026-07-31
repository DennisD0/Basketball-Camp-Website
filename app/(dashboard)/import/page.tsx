'use client'

import { useState, useRef, useCallback } from 'react'

// ── Shared utilities ────────────────────────────────────────────
function parseCSVRow(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuote = false
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote }
    else if (ch === ',' && !inQuote) { result.push(cur.trim()); cur = '' }
    else cur += ch
  }
  result.push(cur.trim())
  return result
}

const MONTHS: Record<string, number> = {
  january:1,february:2,march:3,april:4,may:5,june:6,
  july:7,august:8,september:9,october:10,november:11,december:12,
  jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12,
}

function parseFlexDate(raw: string): string {
  const s = raw.trim()
  if (!s) return '2026-01-01'
  // M/D/YYYY or M/D/YY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (mdy) {
    const yr = mdy[3].length === 2 ? 2000 + +mdy[3] : +mdy[3]
    return `${yr}-${mdy[1].padStart(2,'0')}-${mdy[2].padStart(2,'0')}`
  }
  // "M/D+M/D" range (e.g. "6/16+6/20") — take the first date, assume 2026
  const mdPlus = s.match(/^(\d{1,2})\/(\d{1,2})\+/)
  if (mdPlus) return `2026-${mdPlus[1].padStart(2,'0')}-${mdPlus[2].padStart(2,'0')}`
  const lower = s.toLowerCase()
  // "EndMarch-April" edge case
  if (lower.includes('endmarch')) return '2026-03-31'
  for (const [name, mo] of Object.entries(MONTHS)) {
    const yr = mo >= 10 ? 2025 : 2026
    // exact month name
    if (lower === name) return `${yr}-${String(mo).padStart(2,'0')}-01`
    // "Nov 21" or "Nov 21-22"
    const dm = lower.match(new RegExp(`^${name}\\s+(\\d{1,2})`))
    if (dm) return `${yr}-${String(mo).padStart(2,'0')}-${dm[1].padStart(2,'0')}`
    // "Nov week 1" or "December week 2"
    const wm = lower.match(new RegExp(`^(?:end)?${name}(?:-\\w+)?\\s+week\\s+(\\d)`))
    if (wm) {
      const day = Math.min((+wm[1]-1)*7+1, 28)
      return `${yr}-${String(mo).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    }
    // "April 1" — month name then day with space
    const ap = lower.match(new RegExp(`^${name}\\s+(\\d+)$`))
    if (ap) return `${yr}-${String(mo).padStart(2,'0')}-${ap[1].padStart(2,'0')}`
  }
  return '2026-01-01'
}

// ── Expenses CSV parser ─────────────────────────────────────────
interface ParsedExpense {
  dateStr: string
  date: string
  description: string
  category: string
  paidBy: string
  amount: number
  notes: string
}

function mapExpenseCategory(raw: string): string {
  const r = raw.toLowerCase()
  if (r.includes('facility') || r.includes('rent')) return 'Gym / Facility'
  if (r.includes('equip')) return 'Equipment'
  if (r.includes('uniform')) return 'Uniforms'
  if (r.includes('market')) return 'Marketing'
  return 'Miscellaneous'
}

function parseExpensesCSV(text: string): ParsedExpense[] {
  const lines = text.split(/\r?\n/)
  const results: ParsedExpense[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVRow(lines[i])
    const amountRaw = cells[4]?.replace(/[$,]/g, '').trim()
    const amount = parseFloat(amountRaw ?? '')
    if (!amount || isNaN(amount)) continue
    const rawCategory = cells[2]?.trim() ?? ''
    const description = cells[1]?.trim() || mapExpenseCategory(rawCategory) || 'Expense'
    results.push({
      dateStr: cells[0]?.trim() ?? '',
      date: parseFlexDate(cells[0] ?? ''),
      description,
      category: mapExpenseCategory(rawCategory),
      paidBy: cells[3]?.trim() ?? '',
      amount,
      notes: cells[5]?.trim() ?? '',
    })
  }
  return results
}

// ── Revenue CSV parser ──────────────────────────────────────────
interface ParsedRevenue {
  date: string
  dateStr: string
  studentName: string
  packageType: string
  paymentMethod: string
  amount: number
  notes: string
}

function parseRevenueCSV(text: string): ParsedRevenue[] {
  const lines = text.split(/\r?\n/)
  const results: ParsedRevenue[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVRow(lines[i])
    const amountRaw = cells[4]?.replace(/[$,]/g, '').trim()
    const amount = parseFloat(amountRaw ?? '')
    if (!amount || isNaN(amount)) continue
    const studentName = cells[1]?.trim()
    if (!studentName) continue
    results.push({
      dateStr: cells[0]?.trim() ?? '',
      date: parseFlexDate(cells[0] ?? ''),
      studentName,
      packageType: cells[2]?.trim() ?? '',
      paymentMethod: cells[3]?.trim() ?? '',
      amount,
      notes: cells[5]?.trim() ?? '',
    })
  }
  return results
}

// ── Trial Session CSV parser ────────────────────────────────────
interface ParsedTrial {
  name: string
  classTime: string
  guardianName: string
  guardianPhone: string
  email: string
  age: number | null
  packageInterest: string
  classPref: string
}

function parseTrialCSV(text: string): ParsedTrial[] {
  const lines = text.split(/\r?\n/)
  const results: ParsedTrial[] = []
  // Find header row (contains "Name")
  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(',name,')) { headerIdx = i; break }
  }
  if (headerIdx === -1) return results
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = parseCSVRow(lines[i])
    const name = cells[1]?.trim().replace(/\s*[*#].*$/, '').trim()
    if (!name || /^\d+$/.test(name)) continue
    const age = parseInt(cells[6] ?? '')
    results.push({
      name,
      classTime: cells[2]?.trim() ?? '',
      guardianName: cells[3]?.trim() ?? '',
      guardianPhone: cells[4]?.trim() ?? '',
      email: cells[7]?.trim() ?? '',
      age: isNaN(age) ? null : age,
      packageInterest: cells[8]?.trim() ?? '',
      classPref: cells[9]?.trim() ?? '',
    })
  }
  return results
}

// ── Packages CSV parser ─────────────────────────────────────────
interface ParsedPackage {
  studentName: string
  firstName: string
  lastName: string
  guardianName: string
  guardianPhone: string
  packageType: string
  sessionsTotal: number
  sessionsUsed: number
  sessionsLeft: number
  amountPaid: number
  classes: string
}

function parsePackagesCSV(text: string): ParsedPackage[] {
  const lines = text.split(/\r?\n/)
  const results: ParsedPackage[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVRow(lines[i])
    const studentName = cells[0]?.trim()
    if (!studentName) continue
    const amountRaw = cells[7]?.replace(/[$,]/g, '').trim()
    const amount = parseFloat(amountRaw ?? '0') || 0
    // Handle quoted names like 'Soichiro "Z" Abe'. The parenthetical is KEPT —
    // "Ian Kim (short)" and "Ian Kim (tall)" are two different students, and
    // dropping it silently merged their session counts.
    const noQuotes = studentName.replace(/["]/g, '').trim()
    const paren = noQuotes.match(/\(([^)]*)\)/)?.[1]?.trim()
    const bare = noQuotes.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
    const clean = paren ? `${bare} (${paren})` : bare
    const cleanParts = bare.split(/\s+/)
    const parts = cleanParts
    const classes = [cells[8], cells[9]].filter(c => c?.trim()).join(', ')
    results.push({
      studentName: clean,
      firstName: cleanParts[0],
      lastName: [cleanParts.slice(1).join(' '), paren && `(${paren})`].filter(Boolean).join(' '),
      guardianName: cells[1]?.trim() ?? '',
      guardianPhone: cells[2]?.trim() ?? '',
      packageType: cells[3]?.trim() ?? '',
      sessionsTotal: parseInt(cells[4] ?? '0') || 0,
      sessionsUsed: parseInt(cells[5] ?? '0') || 0,
      sessionsLeft: parseInt(cells[6] ?? '0') || 0,
      amountPaid: amount,
      classes,
    })
    void parts // suppress unused warning
  }
  return results
}

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

// Strips scheduling noise like "(2 pm)" but KEEPS size qualifiers, which are
// the only thing telling two same-named students apart.
const KEEP_QUALIFIER = /^(short|small|tall|big|long)$/i

function cleanName(raw: string): string {
  return raw
    .replace(/\s*\((.*?)\)\s*/g, (_, inner: string) =>
      KEEP_QUALIFIER.test(inner.trim()) ? ` (${inner.trim()}) ` : ' ')
    .replace(/\s+/g, ' ')
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
    // Don't reset inStudentSection — some sheets share a Name header across time slots
    if (nonEmpty.length === 1 && /\d+\s*(am|pm)/i.test(nonEmpty[0])) {
      currentTime = nonEmpty[0].replace(/\s*class\s*/i, '').trim()
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

type Tab = 'attendance' | 'revenue' | 'expenses' | 'packages' | 'trials' | 'profit'

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<Tab>('attendance')
  const fileRef = useRef<HTMLInputElement>(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [fileResults, setFileResults] = useState<{ name: string; result: ParseResult }[]>([])
  const [status, setStatus] = useState<'idle' | 'importing' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ membersCreated: number; membersUpdated: number; membersSkipped: number; attendanceCreated: number; attendanceSkipped: number } | null>(null)
  const [importError, setImportError] = useState('')
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetStatus, setResetStatus] = useState<'idle' | 'deleting' | 'done' | 'error'>('idle')

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle')
  const [syncResult, setSyncResult] = useState<{ updated: number } | null>(null)

  async function handleSyncSessions() {
    setSyncStatus('syncing')
    setSyncResult(null)
    try {
      const res = await fetch('/api/members/sync-sessions', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setSyncStatus('error'); return }
      setSyncResult(data)
      setSyncStatus('done')
    } catch { setSyncStatus('error') }
  }

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

  const tabs: { key: Tab; label: string; desc: string }[] = [
    { key: 'attendance', label: 'Check-in', desc: 'Check-in CSV (multi-file)' },
    { key: 'revenue',    label: 'Revenue',    desc: 'Revenue CSV → Payments' },
    { key: 'expenses',   label: 'Expenses',   desc: 'Expenses CSV → Expenses' },
    { key: 'packages',   label: 'Student & Packages', desc: 'Student & Packages CSV' },
    { key: 'trials',     label: 'Trial Session',      desc: 'Trial Session CSV' },
    { key: 'profit',     label: 'Monthly Profit Tracker', desc: 'Monthly Profit Tracker CSV' },
  ]

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-condensed font-bold text-2xl text-brand-navy tracking-wide">Import from Google Sheets</h1>
          <p className="text-sm text-gray-500 mt-1">
            Export each sheet as CSV and import it here. Select the matching tab for each file type.
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

      {/* Tab bar */}
      <div className="flex gap-1.5 mb-5 bg-gray-100 p-1 rounded-2xl overflow-x-auto scrollbar-none">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === t.key
                ? 'bg-white text-brand-navy shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'attendance' && <>

      {/* Sync Sessions */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 mb-4 overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-gray-50">
          <p className="text-sm font-semibold text-gray-800">Sync Sessions Used</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Recalculates each member&apos;s sessions used from actual attendance records. Run this if the card shows the wrong count.
          </p>
        </div>
        <div className="p-4 flex items-center gap-3">
          <button
            onClick={handleSyncSessions}
            disabled={syncStatus === 'syncing'}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-brand-navy text-white hover:bg-brand-navy/90 transition-all active:scale-95 disabled:opacity-50"
          >
            {syncStatus === 'syncing' ? 'Syncing…' : 'Sync Sessions'}
          </button>
          {syncStatus === 'done' && syncResult && (
            <p className="text-xs text-green-600 font-medium">
              ✓ {syncResult.updated === 0 ? 'All sessions already up to date' : `Updated ${syncResult.updated} member${syncResult.updated !== 1 ? 's' : ''}`}
            </p>
          )}
          {syncStatus === 'error' && (
            <p className="text-xs text-red-500">Sync failed — check your connection</p>
          )}
        </div>
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

      </> /* end attendance tab */}

      {activeTab === 'revenue'  && <RevenueImportSection />}
      {activeTab === 'expenses' && <ExpensesImportSection />}
      {activeTab === 'packages' && <PackagesImportSection />}
      {activeTab === 'trials'   && <TrialsImportSection />}
      {activeTab === 'profit'   && <MonthlyProfitImportSection />}

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

// ── Shared drop-zone ────────────────────────────────────────────
function DropZone({ onFile, label }: { onFile: (f: File) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div
      className="bg-white rounded-2xl p-8 shadow-sm ring-1 ring-black/5 mb-5 text-center cursor-pointer hover:ring-brand-teal/40 transition-all"
      onClick={() => ref.current?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
    >
      <input ref={ref} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      <div className="w-12 h-12 rounded-2xl bg-brand-navy/5 flex items-center justify-center mx-auto mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-brand-navy/40">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      </div>
      <p className="font-semibold text-brand-navy text-sm">{label}</p>
      <p className="text-xs text-gray-400 mt-1">Tap to choose or drag & drop a CSV file</p>
    </div>
  )
}

// ── Revenue import ──────────────────────────────────────────────
function RevenueImportSection() {
  const [rows, setRows] = useState<ParsedRevenue[]>([])
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState<'idle'|'importing'|'done'|'error'>('idle')
  const [result, setResult] = useState<{ paymentsCreated: number; paymentsSkipped: number; membersCreated: number; errors: string[] } | null>(null)
  const [err, setErr] = useState('')

  const handleFile = useCallback((file: File) => {
    setFileName(file.name)
    setStatus('idle'); setResult(null)
    const reader = new FileReader()
    reader.onload = e => setRows(parseRevenueCSV(e.target?.result as string))
    reader.readAsText(file)
  }, [])

  async function handleImport() {
    setStatus('importing'); setErr('')
    try {
      const res = await fetch('/api/finances/payments/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'Import failed'); setStatus('error'); return }
      setResult(data); setStatus('done')
    } catch (e) { setErr(String(e)); setStatus('error') }
  }

  const total = rows.reduce((s, r) => s + r.amount, 0)

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-700">Revenue CSV → Payments</p>
        <p className="text-xs text-gray-400 mt-0.5">Upload your Revenue spreadsheet. Students are matched to existing members by name — new names become stub members.</p>
      </div>
      <DropZone onFile={handleFile} label={fileName ? `${fileName} — ${rows.length} rows` : 'Upload 413 – Revenue .csv'} />

      {rows.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5 mb-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatTile label="Payments" value={String(rows.length)} />
            <StatTile label="Total" value={`$${total.toLocaleString()}`} />
            <StatTile label="Date range" value={`${rows[rows.length-1]?.dateStr} – ${rows[0]?.dateStr}`} />
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0 gap-2">
                <div className="min-w-0">
                  <span className="font-medium text-gray-800 truncate">{r.studentName}</span>
                  {r.packageType && <span className="ml-1.5 text-gray-400">{r.packageType}</span>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-gray-400">{r.paymentMethod || '—'}</span>
                  <span className="font-semibold text-brand-teal">${r.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === 'done' && result && (
        <div className="bg-green-50 rounded-xl p-4 text-sm text-green-700 mb-4 space-y-1">
          <p>✓ <strong>{result.paymentsCreated}</strong> payments imported</p>
          {result.paymentsSkipped > 0 && <p className="text-gray-500">↩ <strong>{result.paymentsSkipped}</strong> already imported earlier — skipped, not double-counted</p>}
          {result.membersCreated > 0 && <p>✓ <strong>{result.membersCreated}</strong> new members created</p>}
          {result.errors.length > 0 && <p className="text-amber-600 text-xs">{result.errors.length} skipped — check console</p>}
        </div>
      )}
      {status === 'error' && <div className="bg-red-50 rounded-xl p-4 text-sm text-red-600 mb-4">{err}</div>}

      {rows.length > 0 && status !== 'done' && (
        <button
          onClick={handleImport}
          disabled={status === 'importing'}
          className="w-full py-3.5 bg-brand-navy text-white rounded-2xl text-sm font-semibold hover:bg-brand-navy/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {status === 'importing' ? 'Importing…' : `Import ${rows.length} payments`}
        </button>
      )}
    </div>
  )
}

// ── Expenses import ─────────────────────────────────────────────
function ExpensesImportSection() {
  const [rows, setRows] = useState<ParsedExpense[]>([])
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState<'idle'|'importing'|'done'|'error'>('idle')
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)
  const [err, setErr] = useState('')

  const handleFile = useCallback((file: File) => {
    setFileName(file.name); setStatus('idle'); setResult(null)
    const reader = new FileReader()
    reader.onload = e => setRows(parseExpensesCSV(e.target?.result as string))
    reader.readAsText(file)
  }, [])

  async function handleImport() {
    setStatus('importing'); setErr('')
    try {
      const res = await fetch('/api/expenses/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses: rows }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'Import failed'); setStatus('error'); return }
      setResult(data); setStatus('done')
    } catch (e) { setErr(String(e)); setStatus('error') }
  }

  const total = rows.reduce((s, r) => s + r.amount, 0)

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-700">Expenses CSV → Expenses</p>
        <p className="text-xs text-gray-400 mt-0.5">Upload your Expenses spreadsheet. Dates like "Nov week 1" or "Oct" are parsed automatically.</p>
      </div>
      <DropZone onFile={handleFile} label={fileName ? `${fileName} — ${rows.length} rows` : 'Upload 413 – Expenses .csv'} />

      {rows.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5 mb-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatTile label="Expenses" value={String(rows.length)} />
            <StatTile label="Total" value={`$${total.toLocaleString()}`} color="orange" />
            <StatTile label="Categories" value={String(new Set(rows.map(r => r.category)).size)} />
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0 gap-2">
                <div className="min-w-0">
                  <span className="font-medium text-gray-800 truncate">{r.description}</span>
                  <span className="ml-1.5 text-gray-400">{r.category}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-gray-400">{r.dateStr || r.date}</span>
                  <span className="font-semibold text-brand-orange">${r.amount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === 'done' && result && (
        <div className="bg-green-50 rounded-xl p-4 text-sm text-green-700 mb-4 space-y-1">
          <p>✓ <strong>{result.created}</strong> expenses imported</p>
          {result.skipped > 0 && <p className="text-gray-500">↩ <strong>{result.skipped}</strong> already imported earlier — skipped, not double-counted</p>}
        </div>
      )}
      {status === 'error' && <div className="bg-red-50 rounded-xl p-4 text-sm text-red-600 mb-4">{err}</div>}

      {rows.length > 0 && status !== 'done' && (
        <button
          onClick={handleImport}
          disabled={status === 'importing'}
          className="w-full py-3.5 bg-brand-navy text-white rounded-2xl text-sm font-semibold hover:bg-brand-navy/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {status === 'importing' ? 'Importing…' : `Import ${rows.length} expenses`}
        </button>
      )}
    </div>
  )
}

// ── Packages import ─────────────────────────────────────────────
function PackagesImportSection() {
  const [rows, setRows] = useState<ParsedPackage[]>([])
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState<'idle'|'importing'|'done'|'error'>('idle')
  const [result, setResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null)
  const [err, setErr] = useState('')

  const handleFile = useCallback((file: File) => {
    setFileName(file.name); setStatus('idle'); setResult(null)
    const reader = new FileReader()
    reader.onload = e => setRows(parsePackagesCSV(e.target?.result as string))
    reader.readAsText(file)
  }, [])

  async function handleImport() {
    setStatus('importing'); setErr('')
    try {
      const payload = rows.map(r => ({
        firstName: r.firstName,
        lastName: r.lastName,
        guardianName: r.guardianName,
        guardianPhone: r.guardianPhone,
        packageType: r.packageType,
        sessionsTotal: r.sessionsTotal,
        sessionsUsed: r.sessionsUsed,
        amountPaid: r.amountPaid,
        teamAssignment: r.classes,
      }))
      const res = await fetch('/api/members/import-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: payload }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'Import failed'); setStatus('error'); return }
      setResult(data); setStatus('done')
    } catch (e) { setErr(String(e)); setStatus('error') }
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-700">Student & Packages CSV → Members</p>
        <p className="text-xs text-gray-400 mt-0.5">Creates or updates members with package type, session counts, guardian info, and class assignments. Existing members are matched by name.</p>
        <p className="text-xs text-gray-400 mt-1">Amount Paid is shown below for reference only — it is <strong>not</strong> added to finances. The Revenue CSV is the sole source of truth for money.</p>
      </div>
      <DropZone onFile={handleFile} label={fileName ? `${fileName} — ${rows.length} students` : 'Upload 413 – Student&Packages .csv'} />

      {rows.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5 mb-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatTile label="Students" value={String(rows.length)} />
            <StatTile label="Packages" value={String(new Set(rows.map(r => r.packageType)).size)} />
            <StatTile label="Total paid (ref only)" value={`$${rows.reduce((s,r)=>s+r.amountPaid,0).toLocaleString()}`} />
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0 gap-2">
                <div className="min-w-0">
                  <span className="font-medium text-gray-800">{r.studentName}</span>
                  {r.guardianName && <span className="ml-1.5 text-gray-400">{r.guardianName}</span>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-gray-500">
                  <span>{r.packageType}</span>
                  <span>{r.sessionsUsed}/{r.sessionsTotal} sessions</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === 'done' && result && (
        <div className="bg-green-50 rounded-xl p-4 text-sm text-green-700 mb-4 space-y-1">
          {result.created > 0 && <p>✓ <strong>{result.created}</strong> new members created</p>}
          {result.updated > 0 && <p>✓ <strong>{result.updated}</strong> members updated</p>}
          {result.errors.length > 0 && <p className="text-amber-600 text-xs">{result.errors.length} errors — {result.errors[0]}</p>}
        </div>
      )}
      {status === 'error' && <div className="bg-red-50 rounded-xl p-4 text-sm text-red-600 mb-4">{err}</div>}

      {rows.length > 0 && status !== 'done' && (
        <button
          onClick={handleImport}
          disabled={status === 'importing'}
          className="w-full py-3.5 bg-brand-navy text-white rounded-2xl text-sm font-semibold hover:bg-brand-navy/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {status === 'importing' ? 'Importing…' : `Import ${rows.length} students`}
        </button>
      )}
    </div>
  )
}

// ── Trials import ───────────────────────────────────────────────
function TrialsImportSection() {
  const [rows, setRows] = useState<ParsedTrial[]>([])
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState<'idle'|'importing'|'done'|'error'>('idle')
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)
  const [err, setErr] = useState('')

  const handleFile = useCallback((file: File) => {
    setFileName(file.name); setStatus('idle'); setResult(null)
    const reader = new FileReader()
    reader.onload = e => setRows(parseTrialCSV(e.target?.result as string))
    reader.readAsText(file)
  }, [])

  async function handleImport() {
    setStatus('importing'); setErr('')
    try {
      const res = await fetch('/api/trials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'Import failed'); setStatus('error'); return }
      setResult(data); setStatus('done')
    } catch (e) { setErr(String(e)); setStatus('error') }
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-700">Trial Session CSV → Trials</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Upload your Trial Session spreadsheet. Students are added to the{' '}
          <a href="/trials" className="text-brand-teal underline">Trials page</a>{' '}
          where you can mark them as converted when they sign up.
        </p>
      </div>
      <DropZone onFile={handleFile} label={fileName ? `${fileName} — ${rows.length} students` : 'Upload 413 – Trial Session .csv'} />

      {rows.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5 mb-4">
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0 gap-2">
                <div className="min-w-0">
                  <span className="font-medium text-gray-800">{r.name}</span>
                  {r.age && <span className="ml-1.5 text-gray-400">Age {r.age}</span>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-gray-500">
                  {r.classTime && <span>{r.classTime}</span>}
                  {r.guardianPhone && <span>{r.guardianPhone}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === 'done' && result && (
        <div className="bg-green-50 rounded-xl p-4 text-sm text-green-700 mb-4">
          ✓ <strong>{result.created}</strong> trial students imported
          {result.skipped > 0 && <> · <span className="text-gray-500">{result.skipped} already imported, skipped</span></>} —{' '}
          <a href="/trials" className="underline font-semibold">View Trials →</a>
        </div>
      )}
      {status === 'error' && <div className="bg-red-50 rounded-xl p-4 text-sm text-red-600 mb-4">{err}</div>}

      {rows.length > 0 && status !== 'done' && (
        <button
          onClick={handleImport}
          disabled={status === 'importing'}
          className="w-full py-3.5 bg-brand-navy text-white rounded-2xl text-sm font-semibold hover:bg-brand-navy/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {status === 'importing' ? 'Importing…' : `Import ${rows.length} trial students`}
        </button>
      )}
    </div>
  )
}

// ── Monthly Profit Tracker import ───────────────────────────────
interface ParsedProfit {
  period: string
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  billyShare?: number
  benShare?: number
  notes?: string
}

function parseAmount(v: string): number {
  return parseFloat(v.replace(/[$,\s]/g, '')) || 0
}

function parseProfitCSV(raw: string): ParsedProfit[] {
  const lines = raw.split(/\r?\n/)
  const rows: ParsedProfit[] = []
  for (const line of lines) {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    const period = cols[0]
    if (!period || period.toLowerCase() === 'month') continue
    const totalRevenue = parseAmount(cols[1])
    const totalExpenses = parseAmount(cols[2])
    const netProfit = parseAmount(cols[3])
    if (!totalRevenue && !totalExpenses && !netProfit) continue
    rows.push({
      period,
      totalRevenue,
      totalExpenses,
      netProfit,
      billyShare: parseAmount(cols[4]) || undefined,
      benShare: parseAmount(cols[5]) || undefined,
      notes: cols[7] || undefined,
    })
  }
  return rows
}

function MonthlyProfitImportSection() {
  const [rows, setRows] = useState<ParsedProfit[]>([])
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState<'idle'|'importing'|'done'|'error'>('idle')
  const [result, setResult] = useState<{ created: number; updated: number } | null>(null)
  const [err, setErr] = useState('')

  const handleFile = useCallback((file: File) => {
    setFileName(file.name); setStatus('idle'); setResult(null)
    const reader = new FileReader()
    reader.onload = e => setRows(parseProfitCSV(e.target?.result as string))
    reader.readAsText(file)
  }, [])

  async function handleImport() {
    setStatus('importing'); setErr('')
    try {
      const res = await fetch('/api/monthly-profit/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'Import failed'); setStatus('error'); return }
      setResult(data); setStatus('done')
    } catch (e) { setErr(String(e)); setStatus('error') }
  }

  const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0)
  const totalProfit  = rows.reduce((s, r) => s + r.netProfit, 0)

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-700">Monthly Profit Tracker CSV → Financial Summary</p>
        <p className="text-xs text-gray-400 mt-0.5">Upload your Monthly Profit Tracker spreadsheet. Each period is upserted — re-importing updates existing records.</p>
      </div>
      <DropZone onFile={handleFile} label={fileName ? `${fileName} — ${rows.length} period${rows.length !== 1 ? 's' : ''}` : 'Upload 413 – Monthly Profit Tracker .csv'} />

      {rows.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5 mb-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatTile label="Periods" value={String(rows.length)} />
            <StatTile label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} color="teal" />
            <StatTile label="Net Profit" value={`$${totalProfit.toLocaleString()}`} color="orange" />
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0 gap-2">
                <span className="font-medium text-gray-800">{r.period}</span>
                <div className="flex items-center gap-3 flex-shrink-0 text-right">
                  <span className="text-gray-400">Rev <span className="text-gray-700 font-medium">${r.totalRevenue.toLocaleString()}</span></span>
                  <span className="text-gray-400">Exp <span className="text-gray-700 font-medium">${r.totalExpenses.toLocaleString()}</span></span>
                  <span className={`font-semibold ${r.netProfit >= 0 ? 'text-brand-teal' : 'text-brand-orange'}`}>${r.netProfit.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === 'done' && result && (
        <div className="bg-green-50 rounded-xl p-4 text-sm text-green-700 mb-4">
          ✓ <strong>{result.created}</strong> period{result.created !== 1 ? 's' : ''} created
          {result.updated > 0 && <>, <strong>{result.updated}</strong> updated</>}
        </div>
      )}
      {status === 'error' && <div className="bg-red-50 rounded-xl p-4 text-sm text-red-600 mb-4">{err}</div>}

      {rows.length > 0 && status !== 'done' && (
        <button
          onClick={handleImport}
          disabled={status === 'importing'}
          className="w-full py-3.5 bg-brand-navy text-white rounded-2xl text-sm font-semibold hover:bg-brand-navy/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {status === 'importing' ? 'Importing…' : `Import ${rows.length} period${rows.length !== 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  )
}

// ── Shared stat tile ────────────────────────────────────────────
function StatTile({ label, value, color = 'navy' }: { label: string; value: string; color?: 'navy'|'teal'|'orange' }) {
  const cls = { navy: 'text-brand-navy', teal: 'text-brand-teal', orange: 'text-brand-orange' }[color]
  return (
    <div className="bg-brand-navy/5 rounded-xl p-3 text-center">
      <div className={`text-xl font-bold ${cls}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
