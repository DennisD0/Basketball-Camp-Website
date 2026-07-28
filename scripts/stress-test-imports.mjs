/**
 * Import stress test — runs against a local Next.js dev server at localhost:3000.
 * Usage: node scripts/stress-test-imports.mjs
 *
 * Requires the server to be running and an "auth" cookie to be set.
 * We fake auth by passing the cookie directly (same value the login route sets).
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CSV_DIR = path.join('C:\\Users\\Gyeonghwan Do\\Downloads')
const BASE = 'http://localhost:3000'

// Auth cookie — populated after login
let AUTH_COOKIE = ''

// ─────────────────────────────────────────────────────────────
// CSV parsers (mirrors the client-side logic exactly)
// ─────────────────────────────────────────────────────────────

function parseCSVRow(line) {
  const result = []
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

const MONTHS = {
  january:1,february:2,march:3,april:4,may:5,june:6,
  july:7,august:8,september:9,october:10,november:11,december:12,
  jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12,
}

function parseFlexDate(raw) {
  const s = raw.trim()
  if (!s) return '2026-01-01'
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (mdy) {
    const yr = mdy[3].length === 2 ? 2000 + +mdy[3] : +mdy[3]
    return `${yr}-${mdy[1].padStart(2,'0')}-${mdy[2].padStart(2,'0')}`
  }
  // "M/D+M/D" range (e.g. "6/16+6/20") — take first date, assume 2026
  const mdPlus = s.match(/^(\d{1,2})\/(\d{1,2})\+/)
  if (mdPlus) return `2026-${mdPlus[1].padStart(2,'0')}-${mdPlus[2].padStart(2,'0')}`
  const lower = s.toLowerCase()
  if (lower.includes('endmarch')) return '2026-03-31'
  for (const [name, mo] of Object.entries(MONTHS)) {
    const yr = mo >= 10 ? 2025 : 2026
    if (lower === name) return `${yr}-${String(mo).padStart(2,'0')}-01`
    const dm = lower.match(new RegExp(`^${name}\\s+(\\d{1,2})`))
    if (dm) return `${yr}-${String(mo).padStart(2,'0')}-${dm[1].padStart(2,'0')}`
    const wm = lower.match(new RegExp(`^(?:end)?${name}(?:-\\w+)?\\s+week\\s+(\\d)`))
    if (wm) {
      const day = Math.min((+wm[1]-1)*7+1, 28)
      return `${yr}-${String(mo).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    }
    const ap = lower.match(new RegExp(`^${name}\\s+(\\d+)$`))
    if (ap) return `${yr}-${String(mo).padStart(2,'0')}-${ap[1].padStart(2,'0')}`
  }
  return '2026-01-01'
}

function mapExpenseCategory(raw) {
  const r = raw.toLowerCase()
  if (r.includes('facility') || r.includes('rent')) return 'Gym / Facility'
  if (r.includes('equip')) return 'Equipment'
  if (r.includes('uniform')) return 'Uniforms'
  if (r.includes('market')) return 'Marketing'
  return 'Miscellaneous'
}

function parseExpensesCSV(text) {
  const lines = text.split(/\r?\n/)
  const results = []
  const warnings = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVRow(lines[i])
    const amountRaw = cells[4]?.replace(/[$,]/g, '').trim()
    const amount = parseFloat(amountRaw ?? '')
    if (!amount || isNaN(amount)) continue
    const rawCategory = cells[2]?.trim() ?? ''
    const description = cells[1]?.trim() || mapExpenseCategory(rawCategory) || 'Expense'
    const rawDate = cells[0]?.trim() ?? ''
    const date = parseFlexDate(rawDate)
    // Warn only if date truly fell through (not legitimate Jan 1 / Jan week 1)
    const isLegitJan1 = /jan(uary)?\s*(week\s*1|1\b)/i.test(rawDate) || /^january$/i.test(rawDate)
    if (date === '2026-01-01' && rawDate && !isLegitJan1) {
      warnings.push(`  ⚠  Row ${i+1}: date "${rawDate}" → fallback 2026-01-01`)
    }
    results.push({
      dateStr: rawDate,
      date,
      description,
      category: mapExpenseCategory(cells[2] ?? ''),
      paidBy: cells[3]?.trim() ?? '',
      amount,
      notes: cells[5]?.trim() ?? '',
    })
  }
  return { results, warnings }
}

function parseRevenueCSV(text) {
  const lines = text.split(/\r?\n/)
  const results = []
  const warnings = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVRow(lines[i])
    const amountRaw = cells[4]?.replace(/[$,]/g, '').trim()
    const amount = parseFloat(amountRaw ?? '')
    if (!amount || isNaN(amount)) continue
    const studentName = cells[1]?.trim()
    if (!studentName) continue
    const rawDate = cells[0]?.trim() ?? ''
    const date = parseFlexDate(rawDate)
    if (date === '2026-01-01' && rawDate && rawDate !== 'January') {
      warnings.push(`  ⚠  Row ${i+1}: date "${rawDate}" for "${studentName}" → fallback 2026-01-01`)
    }
    if (studentName.toLowerCase() === 'unknown') {
      warnings.push(`  ⚠  Row ${i+1}: "Unknown" student — will be skipped by API`)
    }
    results.push({
      dateStr: rawDate,
      date,
      studentName,
      packageType: cells[2]?.trim() ?? '',
      paymentMethod: cells[3]?.trim() ?? '',
      amount,
      notes: cells[5]?.trim() ?? '',
    })
  }
  return { results, warnings }
}

function parseTrialCSV(text) {
  const lines = text.split(/\r?\n/)
  const results = []
  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(',name,')) { headerIdx = i; break }
  }
  if (headerIdx === -1) return { results, warnings: ['No header row found'] }
  const warnings = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = parseCSVRow(lines[i])
    const rawName = cells[1]?.trim() ?? ''
    const name = rawName.replace(/\s*[*#].*$/, '').trim()
    if (!name || /^\d+$/.test(name)) continue
    if (rawName !== name) {
      warnings.push(`  ℹ  Row ${i+1}: cleaned name "${rawName}" → "${name}"`)
    }
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
  return { results, warnings }
}

function parsePackagesCSV(text) {
  const lines = text.split(/\r?\n/)
  const results = []
  const warnings = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVRow(lines[i])
    const studentName = cells[0]?.trim()
    if (!studentName) continue
    const amountRaw = cells[7]?.replace(/[$,]/g, '').trim()
    const amount = parseFloat(amountRaw ?? '0') || 0
    // Keep the parenthetical — it distinguishes "Ian Kim (short)" from "(tall)"
    const noQuotes = studentName.replace(/["]/g, '').trim()
    const paren = noQuotes.match(/\(([^)]*)\)/)?.[1]?.trim()
    const bare = noQuotes.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
    const clean = paren ? `${bare} (${paren})` : bare
    if (clean !== noQuotes) {
      warnings.push(`  ℹ  Row ${i+1}: "${studentName}" → cleaned to "${clean}"`)
    }
    const cleanParts = bare.split(/\s+/)
    const classes = [cells[8], cells[9]].filter(c => c?.trim()).join(', ')
    const sessionsTotal = parseInt(cells[4] ?? '0') || 0
    const sessionsUsed = parseInt(cells[5] ?? '0') || 0
    if (sessionsTotal === 0 && sessionsUsed === 0 && amount === 0) continue // empty row
    results.push({
      studentName: clean,
      firstName: cleanParts[0],
      lastName: [cleanParts.slice(1).join(' '), paren && `(${paren})`].filter(Boolean).join(' '),
      guardianName: cells[1]?.trim() ?? '',
      guardianPhone: cells[2]?.trim() ?? '',
      packageType: cells[3]?.trim() ?? '',
      sessionsTotal,
      sessionsUsed,
      sessionsLeft: parseInt(cells[6] ?? '0') || 0,
      amountPaid: amount,
      classes,
    })
  }
  return { results, warnings }
}

function parseAmount(v) {
  return parseFloat((v ?? '').replace(/[$,\s]/g, '')) || 0
}

function parseProfitCSV(raw) {
  const lines = raw.split(/\r?\n/)
  const rows = []
  for (const line of lines) {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    const period = cols[0]
    if (!period || period.toLowerCase() === 'month') continue
    const totalRevenue = parseAmount(cols[1])
    const totalExpenses = parseAmount(cols[2])
    const netProfit = parseAmount(cols[3])
    if (!totalRevenue && !totalExpenses && !netProfit) continue
    rows.push({
      period, totalRevenue, totalExpenses, netProfit,
      billyShare: parseAmount(cols[4]) || undefined,
      benShare: parseAmount(cols[5]) || undefined,
      notes: cols[7] || undefined,
    })
  }
  return rows
}

function parseAttendanceCSV(text, year) {
  const lines = text.split(/\r?\n/)
  const members = []
  const errors = []
  const warnings = []
  const seen = new Map()

  let currentDay = ''
  let currentTime = ''
  let dateCols = []
  let inStudentSection = false

  function parseDate(cell) {
    const m = cell.trim().match(/^(\d{1,2})\/(\d{1,2})$/)
    if (!m) return null
    return `${year}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`
  }

  const KEEP_QUALIFIER = /^(short|small|tall|big|long)$/i
  function cleanName(raw) {
    return raw
      .replace(/\s*\((.*?)\)\s*/g, (_, inner) =>
        KEEP_QUALIFIER.test(inner.trim()) ? ` (${inner.trim()}) ` : ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim())
    const nonEmpty = cells.filter(Boolean)

    if (nonEmpty.length === 1 && /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(nonEmpty[0])) {
      currentDay = nonEmpty[0]
      currentTime = ''
      inStudentSection = false
      continue
    }

    if (nonEmpty.length === 1 && /\d+\s*(am|pm)/i.test(nonEmpty[0])) {
      currentTime = nonEmpty[0].replace(/\s*class\s*/i, '').trim()
      continue
    }

    const nameColIdx = cells.findIndex(c => c.toLowerCase() === 'name')
    if (nameColIdx !== -1) {
      dateCols = []
      const seenDates = new Set()
      for (let j = nameColIdx + 1; j < cells.length; j++) {
        const parsed = parseDate(cells[j])
        if (parsed) {
          if (seenDates.has(parsed)) {
            warnings.push(`  ⚠  Duplicate date column ${cells[j]} in ${currentDay} ${currentTime} section`)
          }
          seenDates.add(parsed)
          dateCols.push({ col: j, date: parsed })
        }
      }
      inStudentSection = true
      continue
    }

    if (!inStudentSection) continue
    if (nonEmpty.length === 0) { inStudentSection = false; continue }

    const rawName = cells[1] ?? ''
    if (!rawName.trim() || /^\d+$/.test(rawName.trim())) continue

    const name = cleanName(rawName)
    if (!name) continue

    const classLabel = [currentDay, currentTime].filter(Boolean).join(' ')
    const attendanceDates = []
    for (const { col, date } of dateCols) {
      if ((cells[col] ?? '').toLowerCase() === 'present') attendanceDates.push(date)
    }

    const key = name.toLowerCase()
    if (seen.has(key)) {
      const existing = seen.get(key)
      const before = existing.attendanceDates.length
      for (const d of attendanceDates) {
        if (!existing.attendanceDates.includes(d)) existing.attendanceDates.push(d)
      }
      if (existing.attendanceDates.length > before) {
        warnings.push(`  ℹ  Merged ${attendanceDates.length} new dates for "${name}" (${classLabel})`)
      }
    } else {
      const parts = name.trim().split(/\s+/)
      const member = {
        name,
        firstName: parts[0] ?? name,
        lastName: parts.slice(1).join(' '),
        classLabel,
        attendanceDates,
      }
      seen.set(key, member)
      members.push(member)
    }
  }

  if (members.length === 0) errors.push('No students found')
  return { members, errors, warnings }
}

// ─────────────────────────────────────────────────────────────
// HTTP helpers
// ─────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: AUTH_COOKIE,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = { raw: text } }
  return { ok: res.ok, status: res.status, json }
}

function readCSV(filename) {
  const p = path.join(CSV_DIR, filename)
  return fs.readFileSync(p, 'utf-8')
}

function pass(msg) { console.log(`  ✅ ${msg}`) }
function fail(msg) { console.log(`  ❌ ${msg}`) }
function info(msg) { console.log(`  ℹ  ${msg}`) }
function warn(msg) { console.log(`  ⚠  ${msg}`) }
function section(title) { console.log(`\n${'─'.repeat(60)}\n${title}\n${'─'.repeat(60)}`) }

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🏀  413 Import Stress Test\n')

  // ── 0. Auth ──────────────────────────────────────────────────
  section('0 · Auth')
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: '1234' }),
  })
  if (!login.ok) {
    fail('Login failed — is the server running at localhost:3000?')
    process.exit(1)
  }
  // Extract Set-Cookie header
  const setCookie = login.headers.get('set-cookie') ?? ''
  AUTH_COOKIE = setCookie.split(';')[0]  // e.g. "auth=<value>"
  if (!AUTH_COOKIE) {
    fail('No auth cookie returned by login')
    process.exit(1)
  }
  pass(`Logged in, cookie: ${AUTH_COOKIE}`)
  const authCheck = await api('GET', '/api/members')
  if (authCheck.ok) pass('Auth verified — /api/members accessible')
  else fail(`Auth not working: ${JSON.stringify(authCheck.json)}`)

  // ── 1. Parse all CSVs locally first, report edge cases ───────
  section('1 · Parsing CSVs (client-side, no network)')

  console.log('\n[Expenses.csv]')
  const expensesCSV = readCSV('Copy of 413 - Expenses.csv')
  const { results: expenses, warnings: expWarn } = parseExpensesCSV(expensesCSV)
  pass(`Parsed ${expenses.length} expense rows`)
  const fallbackDates = expenses.filter(e => e.date === '2026-01-01' && e.dateStr && e.dateStr.toLowerCase() !== 'january')
  if (fallbackDates.length) {
    fallbackDates.forEach(e => warn(`Date fallback: "${e.dateStr}" → 2026-01-01 for "${e.description}"`))
  } else {
    pass('All dates resolved (no fallbacks)')
  }
  expWarn.forEach(w => console.log(w))
  // Spot-check known edge cases
  const e6_16 = expenses.find(e => e.dateStr === '6/16+6/20')
  if (e6_16 && e6_16.date !== '2026-01-01') pass(`"6/16+6/20" → ${e6_16.date}`)
  else fail(`"6/16+6/20" not parsed correctly (got ${e6_16?.date ?? 'missing'})`)
  const eEndMarch = expenses.find(e => e.dateStr.toLowerCase().includes('endmarch'))
  if (eEndMarch) pass(`"${eEndMarch.dateStr}" → ${eEndMarch.date}`)
  const eAprW5 = expenses.find(e => e.dateStr === 'April week 5')
  if (eAprW5) pass(`"April week 5" → ${eAprW5.date}`)

  console.log('\n[Revenue.csv]')
  const revenueCSV = readCSV('Copy of 413 - Revenue .csv')
  const { results: revenue, warnings: revWarn } = parseRevenueCSV(revenueCSV)
  pass(`Parsed ${revenue.length} revenue rows`)
  revWarn.forEach(w => console.log(w))
  const unknownRow = revenue.find(r => r.studentName.toLowerCase() === 'unknown')
  if (unknownRow) info(`"Unknown" row present — will be skipped at API (amount: $${unknownRow.amount})`)
  const firstNameOnly = revenue.filter(r => !r.studentName.includes(' '))
  info(`${firstNameOnly.length} first-name-only rows: ${firstNameOnly.map(r => r.studentName).join(', ')}`)
  const parenthetical = revenue.filter(r => r.studentName.includes('('))
  info(`${parenthetical.length} parenthetical names: ${parenthetical.map(r => r.studentName).join(', ')}`)

  console.log('\n[Monthly Profit Tracker.csv]')
  const mptCSV = readCSV('Copy of 413 - Monthly Profit Tracker.csv')
  const profits = parseProfitCSV(mptCSV)
  pass(`Parsed ${profits.length} monthly profit rows`)
  profits.forEach(p => info(`  ${p.period}: rev $${p.totalRevenue} · exp $${p.totalExpenses} · net $${p.netProfit}`))
  const badNet = profits.filter(p => Math.abs((p.totalRevenue - p.totalExpenses) - p.netProfit) > 0.5)
  if (badNet.length === 0) pass('Net profit = revenue − expenses on every row')
  else badNet.forEach(p => warn(`${p.period}: net ${p.netProfit} ≠ ${p.totalRevenue} − ${p.totalExpenses}`))

  console.log('\n[Trial Session.csv]')
  const trialCSV = readCSV('Copy of 413 - Trial Session.csv')
  const { results: trials, warnings: trialWarn } = parseTrialCSV(trialCSV)
  pass(`Parsed ${trials.length} trial students`)
  trialWarn.forEach(w => console.log(w))
  trials.forEach(t => info(`  "${t.name}" | class: ${t.classTime || '–'} | guardian: ${t.guardianName || '–'} | phone: ${t.guardianPhone || '–'}`))

  console.log('\n[Student&Packages.csv]')
  const packagesCSV = readCSV('Copy of 413 - Student&Packages.csv')
  const { results: packages, warnings: pkgWarn } = parsePackagesCSV(packagesCSV)
  pass(`Parsed ${packages.length} student package rows`)
  pkgWarn.forEach(w => console.log(w))
  const specialNames = packages.filter(p => p.studentName.includes('"') || p.studentName.includes('('))
  if (specialNames.length === 0) pass('All special names (quoted/parenthetical) cleaned correctly')
  else specialNames.forEach(p => warn(`Special name still present: "${p.studentName}"`))

  console.log('\n[Check-in.csv]')
  const checkinCSV = readCSV('Copy of 413 - Check-in.csv')
  const { members, errors: attErrors, warnings: attWarn } = parseAttendanceCSV(checkinCSV, 2026)
  if (attErrors.length) attErrors.forEach(e => fail(e))
  else pass(`Parsed ${members.length} unique students from attendance`)
  attWarn.forEach(w => console.log(w))
  // Check Saturday 1pm section students are present
  const sammuel = members.find(m => m.name.toLowerCase().includes('sammuel') || m.name.toLowerCase().includes('samuel'))
  if (sammuel) pass(`Saturday 1pm "Sammuel Lee" found with ${sammuel.attendanceDates.length} attendance dates`)
  else fail('Saturday 1pm "Sammuel Lee" NOT found — Saturday 1pm section bug')
  const kamani = members.find(m => m.name.toLowerCase().includes('kamani'))
  if (kamani) pass(`Saturday 1pm "Kamani" found with ${kamani.attendanceDates.length} attendance dates`)
  const totalDates = members.reduce((s, m) => s + m.attendanceDates.length, 0)
  info(`Total attendance records: ${totalDates} across ${members.length} students`)

  // ── 2. Reset all data ─────────────────────────────────────────
  section('2 · Clearing All Data')
  const reset = await api('DELETE', '/api/import')
  if (reset.ok) pass('All data cleared (members, sessions, attendance, payments, expenses, trial students)')
  else { fail(`Reset failed: ${JSON.stringify(reset.json)}`); process.exit(1) }

  // Verify empty
  const afterReset = await api('GET', '/api/members')
  const memberCount = afterReset.json?.length ?? -1
  if (memberCount === 0) pass('Members table is empty')
  else fail(`Expected 0 members after reset, got ${memberCount}`)

  const afterTrials = await api('GET', '/api/trials')
  const trialCount = afterTrials.json?.length ?? -1
  if (trialCount === 0) pass('Trial students table is empty')
  else fail(`Expected 0 trial students after reset, got ${trialCount}`)

  // ── 3. Import Packages (creates members first) ────────────────
  section('3 · Import Student&Packages.csv')
  const pkgRes = await api('POST', '/api/members/import-packages', { rows: packages })
  if (pkgRes.ok) {
    const { created, updated, errors } = pkgRes.json
    pass(`${created} members created, ${updated} updated`)
    if (errors?.length) errors.forEach(e => warn(e))
    else pass('No errors')
  } else {
    fail(`Packages import failed: ${JSON.stringify(pkgRes.json)}`)
  }

  // Verify member count
  const membersAfterPkg = await api('GET', '/api/members')
  const pkgMemberCount = membersAfterPkg.json?.length ?? 0
  info(`Members in DB after packages: ${pkgMemberCount} (expected ${packages.length})`)
  if (pkgMemberCount === packages.length) pass('Member count matches')
  else warn(`Member count mismatch: got ${pkgMemberCount}, expected ${packages.length}`)

  // REGRESSION: packages import must NOT create Payment rows (Revenue CSV owns money)
  const paysAfterPkg = await api('GET', '/api/finances/payments')
  const paysAfterPkgCount = paysAfterPkg.json?.length ?? 0
  const pkgAmountTotal = packages.reduce((s, p) => s + p.amountPaid, 0)
  if (paysAfterPkgCount === 0) {
    pass(`No payments created by packages import (sheet total $${pkgAmountTotal.toLocaleString()} correctly ignored)`)
  } else {
    fail(`REGRESSION: packages import created ${paysAfterPkgCount} payments — revenue will be double-counted`)
  }

  // REGRESSION: sessionsUsed from the sheet must survive into the DB
  const pkgMembers = membersAfterPkg.json ?? []
  const byName = new Map(pkgMembers.map(m => [`${m.firstName} ${m.lastName}`.trim().toLowerCase(), m]))
  let usedOk = 0
  const usedBad = []
  for (const p of packages) {
    const m = byName.get(`${p.firstName} ${p.lastName}`.trim().toLowerCase())
    if (!m) continue
    if (m.sessionsUsed === p.sessionsUsed && m.sessionsTotal === p.sessionsTotal) usedOk++
    else usedBad.push(`${p.studentName}: sheet ${p.sessionsUsed}/${p.sessionsTotal}, DB ${m.sessionsUsed}/${m.sessionsTotal}`)
  }
  if (usedBad.length === 0) pass(`sessionsUsed/sessionsTotal match the sheet for all ${usedOk} students`)
  else usedBad.forEach(b => fail(`Session mismatch — ${b}`))

  // ── 4. Import Attendance ──────────────────────────────────────
  section('4 · Import Check-in.csv (Attendance)')
  const attendanceRows = []
  for (const m of members) {
    for (const d of m.attendanceDates) {
      attendanceRows.push({ memberKey: m.name, date: d })
    }
  }
  const memberRows = members.map(m => ({
    firstName: m.firstName,
    lastName: m.lastName,
    teamAssignment: m.classLabel,
  }))

  const attRes = await api('POST', '/api/import', {
    members: memberRows,
    attendance: attendanceRows,
  })
  if (attRes.ok) {
    const { membersCreated, membersUpdated, membersSkipped, attendanceCreated, attendanceSkipped, aliasResolved } = attRes.json
    pass(`Members: ${membersCreated} created, ${membersUpdated} updated, ${membersSkipped} skipped`)
    ;(aliasResolved ?? []).forEach(a => info(`Alias resolved: ${a}`))
    // "Aaron" attends but has no row in Student & Packages — a legitimately new
    // member, not a duplicate. Anything beyond that is a name-matching failure.
    const EXPECTED_NEW = 1
    if (membersCreated <= EXPECTED_NEW) pass(`Check-in created ${membersCreated} member (Aaron — genuinely absent from the packages sheet), no duplicates`)
    else fail(`REGRESSION: Check-in sheet created ${membersCreated} members, expected at most ${EXPECTED_NEW}`)
    pass(`Attendance: ${attendanceCreated} records created, ${attendanceSkipped} skipped (dupes)`)
    if (attendanceSkipped > 0) warn(`${attendanceSkipped} attendance records were duplicates`)
  } else {
    fail(`Attendance import failed: ${JSON.stringify(attRes.json)}`)
  }

  // ── 5. Import Revenue ─────────────────────────────────────────
  section('5 · Import Revenue.csv')
  const revRes = await api('POST', '/api/finances/payments/import', { rows: revenue })
  if (revRes.ok) {
    const { paymentsCreated, membersCreated, errors } = revRes.json
    pass(`${paymentsCreated} payments created, ${membersCreated} new stub members created`)
    if (errors?.length) {
      warn(`${errors.length} non-fatal errors:`)
      errors.forEach(e => console.log(`    ${e}`))
    } else {
      pass('No errors')
    }
  } else {
    fail(`Revenue import failed: ${JSON.stringify(revRes.json)}`)
  }

  // Check for stub members created (shouldn't create many if packages was imported first)
  const membersAfterRev = await api('GET', '/api/members')
  const revMemberCount = membersAfterRev.json?.length ?? 0
  info(`Members in DB after revenue: ${revMemberCount}`)
  if (revMemberCount > pkgMemberCount) {
    const newStubs = revMemberCount - pkgMemberCount
    warn(`${newStubs} stub members auto-created by revenue import (names not found in packages)`)
    const allMembers = membersAfterRev.json ?? []
    const stubs = allMembers.filter(m => !m.packageType && !m.guardianName)
    stubs.forEach(m => info(`  Stub: "${m.firstName} ${m.lastName}"`))
  }

  // REGRESSION: total payments must equal exactly the revenue rows, nothing more
  const paysAfterRev = await api('GET', '/api/finances/payments')
  const paysAfterRevList = paysAfterRev.json ?? []
  const revTotal = revenue.reduce((s, r) => s + r.amount, 0)
  const dbTotal = paysAfterRevList.reduce((s, p) => s + Number(p.amount), 0)
  info(`Revenue CSV total: $${revTotal.toLocaleString()} · DB payments total: $${dbTotal.toLocaleString()}`)
  const strays = paysAfterRevList.filter(p => (p.notes ?? '').startsWith('Imported from packages sheet'))
  if (strays.length === 0) pass('Zero package-sheet payments in DB')
  else fail(`REGRESSION: ${strays.length} package-sheet payments found`)
  if (Math.abs(dbTotal - revTotal) < 0.5) {
    pass('Finances total matches the Revenue CSV exactly — no double-counting')
  } else {
    warn(`Finances off by $${(dbTotal - revTotal).toLocaleString()} vs Revenue CSV (unknown-student rows are skipped by design)`)
  }

  // ── 6. Import Expenses ────────────────────────────────────────
  section('6 · Import Expenses.csv')
  const expPayload = expenses.map(e => ({
    description: e.description,
    category: e.category,
    amount: e.amount,
    date: e.date,
    paidBy: e.paidBy,
    notes: e.notes,
  }))
  const expRes = await api('POST', '/api/expenses/import', { expenses: expPayload })
  if (expRes.ok) {
    pass(`${expRes.json.created} expenses created`)
  } else {
    fail(`Expenses import failed: ${JSON.stringify(expRes.json)}`)
  }

  // Verify via expenses list
  const expList = await api('GET', '/api/expenses')
  const expCount = expList.json?.length ?? 0
  if (expCount === expenses.length) pass(`Expense count verified: ${expCount}`)
  else warn(`Expense count mismatch: DB has ${expCount}, parsed ${expenses.length}`)

  // ── 7. Import Trial Students ──────────────────────────────────
  section('7 · Import Trial Session.csv')
  const trialRes = await api('POST', '/api/trials', { rows: trials })
  if (trialRes.ok) {
    pass(`${trialRes.json.created} trial students created`)
  } else {
    fail(`Trial import failed: ${JSON.stringify(trialRes.json)}`)
  }

  // Verify
  const trialList = await api('GET', '/api/trials')
  const trialListCount = trialList.json?.length ?? 0
  if (trialListCount === trials.length) pass(`Trial student count verified: ${trialListCount}`)
  else warn(`Trial count mismatch: DB has ${trialListCount}, parsed ${trials.length}`)

  // ── 7b. Import Monthly Profit Tracker ─────────────────────────
  section('7b · Import Monthly Profit Tracker.csv')
  const profRes = await api('POST', '/api/monthly-profit/import', { rows: profits })
  if (profRes.ok) pass(`${profRes.json.created} created, ${profRes.json.updated} updated`)
  else fail(`Profit import failed: ${JSON.stringify(profRes.json)}`)
  // Upsert idempotency: re-running must update, never duplicate
  const profRes2 = await api('POST', '/api/monthly-profit/import', { rows: profits })
  if (profRes2.ok && profRes2.json.created === 0 && profRes2.json.updated === profits.length) {
    pass(`Re-import is idempotent: 0 created, ${profRes2.json.updated} updated`)
  } else {
    fail(`Profit re-import not idempotent: ${JSON.stringify(profRes2.json)}`)
  }

  // ── 7c. Sessions remaining, as the member page computes it ────
  section('7c · Sessions Remaining (post-attendance)')
  const membersFinal = (await api('GET', '/api/members')).json ?? []
  // Logged-attendance counts come from the Check-in CSV we just imported,
  // keyed by name (there is no global attendance list endpoint).
  const attByName = new Map()
  for (const m of members) {
    attByName.set(m.name.trim().toLowerCase(), m.attendanceDates.length)
  }
  const attByMember = new Map()
  for (const m of membersFinal) {
    const k = `${m.firstName} ${m.lastName}`.trim().toLowerCase()
    attByMember.set(m.id, attByName.get(k) ?? 0)
  }
  let shown = 0
  let zeroRemaining = 0
  for (const m of membersFinal) {
    const logged = attByMember.get(m.id) ?? 0
    const used = Math.max(logged, m.sessionsUsed)      // same formula the UI uses
    const remaining = Math.max(0, m.sessionsTotal - used)
    if (remaining === 0) zeroRemaining++
    if (m.sessionsTotal > 0 && shown < 12) {
      info(`${m.firstName} ${m.lastName}: ${remaining}/${m.sessionsTotal} left (used ${used} = ${logged} logged, ${m.sessionsUsed} carried)`)
      shown++
    }
  }
  // Cross-check against the sheet's own "Sessions Left" column
  const leftBad = []
  for (const p of packages) {
    const m = membersFinal.find(x => `${x.firstName} ${x.lastName}`.trim().toLowerCase() === `${p.firstName} ${p.lastName}`.trim().toLowerCase())
    if (!m) continue
    const logged = attByMember.get(m.id) ?? 0
    const remaining = Math.max(0, m.sessionsTotal - Math.max(logged, m.sessionsUsed))
    if (remaining > p.sessionsLeft) {
      leftBad.push(`${p.studentName}: app shows ${remaining} left, sheet says ${p.sessionsLeft}`)
    }
  }
  if (leftBad.length === 0) pass('No student shows more sessions remaining than the sheet allows')
  else leftBad.forEach(b => fail(b))
  info(`${zeroRemaining} students are fully used up (renewal needed)`)

  // `--clean` stops here: reset + one import pass, leaving the DB in the exact
  // state the spreadsheets describe. The race round below deliberately creates
  // duplicates, so it must be skipped when the goal is usable data.
  if (process.argv.includes('--clean')) {
    section('✅  Clean Import Complete — DB matches the spreadsheets')
    const [cm, ce, ct] = await Promise.all([
      api('GET', '/api/members'), api('GET', '/api/expenses'), api('GET', '/api/trials'),
    ])
    const cp = await api('GET', '/api/finances/payments')
    console.log(`  Members:         ${cm.json?.length ?? '?'}`)
    console.log(`  Payments:        ${cp.json?.length ?? '?'} ($${(cp.json ?? []).reduce((s, p) => s + Number(p.amount), 0).toLocaleString()})`)
    console.log(`  Expenses:        ${ce.json?.length ?? '?'}`)
    console.log(`  Trial Students:  ${ct.json?.length ?? '?'}`)
    console.log('')
    return
  }

  // ── 8. Race condition test: concurrent re-import ──────────────
  section('8 · Race Condition Test: Concurrent Duplicate Imports')
  info('Firing packages + revenue + expenses + trials simultaneously...')
  const t0 = Date.now()
  const [r1, r2, r3, r4] = await Promise.all([
    api('POST', '/api/members/import-packages', { rows: packages }),
    api('POST', '/api/finances/payments/import', { rows: revenue }),
    api('POST', '/api/expenses/import', { expenses: expPayload }),
    api('POST', '/api/trials', { rows: trials }),
  ])
  const elapsed = Date.now() - t0
  info(`All 4 concurrent imports completed in ${elapsed}ms`)

  if (r1.ok) pass(`Packages (2nd): ${r1.json.updated ?? 0} updated, ${r1.json.created ?? 0} created, ${r1.json.errors?.length ?? 0} errors`)
  else fail(`Packages (2nd) failed: ${JSON.stringify(r1.json)}`)
  if (r2.ok) pass(`Revenue (2nd): ${r2.json.paymentsCreated} payments, ${r2.json.membersCreated} new stubs`)
  else fail(`Revenue (2nd) failed: ${JSON.stringify(r2.json)}`)
  if (r3.ok) pass(`Expenses (2nd): ${r3.json.created} created (duplicates — expected)`)
  else fail(`Expenses (2nd) failed: ${JSON.stringify(r3.json)}`)
  if (r4.ok) pass(`Trials (2nd): ${r4.json.created} created (duplicates — expected)`)
  else fail(`Trials (2nd) failed: ${JSON.stringify(r4.json)}`)

  // Check for duplicate payments
  const finalPayments = await api('GET', '/api/finances/payments')
  const finalPayList = finalPayments.json ?? []
  const payCount = finalPayList.length
  info(`Total payments in DB: ${payCount}`)
  if (r2.ok && r2.json.paymentsCreated > 0) warn(`Revenue was re-imported: ${r2.json.paymentsCreated} duplicate payments created — the UI should warn users before re-importing`)
  const straysAfterRace = finalPayList.filter(p => (p.notes ?? '').startsWith('Imported from packages sheet'))
  if (straysAfterRace.length === 0) pass('Concurrent packages re-import still created zero payments')
  else fail(`REGRESSION: ${straysAfterRace.length} package-sheet payments after concurrent re-import`)

  // ── 9. Final DB state summary ─────────────────────────────────
  section('9 · Final Database State Summary')
  const [finalMembers, finalExpenses, finalTrials, finalSessions] = await Promise.all([
    api('GET', '/api/members'),
    api('GET', '/api/expenses'),
    api('GET', '/api/trials'),
    fetch(`${BASE}/api/attendance`, { headers: { Cookie: AUTH_COOKIE } }).then(r => r.json()).catch(() => []),
  ])
  console.log(`  Members:         ${finalMembers.json?.length ?? '?'}`)
  console.log(`  Expenses:        ${finalExpenses.json?.length ?? '?'}`)
  console.log(`  Trial Students:  ${finalTrials.json?.length ?? '?'}`)
  console.log(`  Payments:        ${payCount}`)

  // ── Done ──────────────────────────────────────────────────────
  section('✅  Stress Test Complete')
  console.log('')
}

main().catch(e => { console.error('\n💥 Fatal error:', e.message); process.exit(1) })
