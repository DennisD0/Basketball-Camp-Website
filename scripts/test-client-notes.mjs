/**
 * End-to-end test for the 2026-09-01 client notes: registration package credit,
 * the bulk session reset, and roster-scoped attendance saves.
 *
 * Runs against whatever DATABASE_URL points at — today that is the client's live
 * Supabase — so it only ever writes rows it creates itself (named "ZZTest …"),
 * dumps every table first, cleans up in a `finally`, and diffs every table
 * against the dump. Registrations are created with no parent email so approval
 * never sends one.
 *
 *   node scripts/test-client-notes.mjs          (dev server on :3000)
 */
import fs from 'node:fs'
import { PrismaClient } from '@prisma/client'

const BASE = 'http://localhost:3000'
const p = new PrismaClient()
let cookie = ''
let passed = 0, failed = 0
const ok = (cond, msg) => { if (cond) { passed++; console.log(`  ✅ ${msg}`) } else { failed++; console.log(`  ❌ ${msg}`) } }

function envValue(key) {
  for (const f of ['.env.local', '.env']) {
    if (!fs.existsSync(f)) continue
    const m = fs.readFileSync(f, 'utf8').match(new RegExp(`^\\s*${key}\\s*=\\s*"?([^"\\r\\n]*)"?`, 'm'))
    if (m) return m[1]
  }
}

async function api(method, path, body, { auth = true } = {}) {
  const res = await fetch(BASE + path, {
    method,
    // Middleware answers a logged-out request with a 307 to /login; following it
    // would turn that block into a 200 from the login page.
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
  const text = await res.text()
  let json; try { json = JSON.parse(text) } catch { json = { raw: text.slice(0, 200) } }
  return { status: res.status, json }
}

const TABLES = ['member', 'memberPackage', 'session', 'attendance', 'payment', 'feeStructure', 'notification', 'registration', 'trialStudent', 'setting', 'monthlyProfit', 'expense']
async function dump() {
  const out = {}
  for (const t of TABLES) out[t] = await p[t].findMany()
  return out
}
const stable = rows => new Map(rows.map(r => [r.id ?? r.key ?? JSON.stringify(r), JSON.stringify(r)]))

const created = { registrations: [], members: [], sessionDates: [] }

async function main() {
  const before = await dump()
  fs.writeFileSync(process.env.DUMP_PATH ?? 'pre-test-dump.json', JSON.stringify(before))
  console.log('Row counts before:', Object.fromEntries(TABLES.map(t => [t, before[t].length])))
  const clash = before.member.filter(m => m.firstName.startsWith('ZZTest')).length + before.registration.filter(r => r.childName.startsWith('ZZTest')).length
  if (clash) throw new Error('ZZTest rows already exist — refusing to run')

  const login = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: envValue('ADMIN_PASSWORD') }),
  })
  cookie = (login.headers.get('set-cookie') ?? '').split(';')[0]
  if (!login.ok || !cookie) throw new Error('login failed')

  // ── Note 1: approval credits the package the parent picked ───────────────
  console.log('\nNote 1 — registration approval')
  const cases = [
    ['ZZTest BballFive',  'Basketball', '5_sessions',            'basketball_5_sessions',            5, '5 Sessions🏀'],
    ['ZZTest BballSeven', 'Basketball', '7_sessions',            'basketball_7_sessions',            7, '7 Sessions🏀'],
    ['ZZTest BballDrop',  'Basketball', 'drop_in',               'basketball_drop_in',               1, 'Drop-in🏀'],
    ['ZZTest VballFive',  'Volleyball', 'package_1785855209568', 'volleyball_package_1785855209568', 5, '5 sessions🏐'],
    ['ZZTest VballSeven', 'Volleyball', 'package_1785855391156', 'volleyball_package_1785855391156', 7, '7 sessions🏐'],
    ['ZZTest VballDrop',  'Volleyball', 'package_1785855477748', 'volleyball_package_1785855477748', 1, 'Drop-in🏐'],
    ['ZZTest Unknown',    'Volleyball', 'package_999',           'volleyball_package_999',           5, null],
  ]
  for (const [childName, sport, packageOption, programOption, expected, label] of cases) {
    const reg = await p.registration.create({ data: {
      parentName: 'ZZTest Parent', parentEmail: null, parentPhone: '000', whatsappConsent: false,
      childName, programOption, sport, ageGroup: 'Developing', mediaConsent: false, injuryWaiver: true,
      noRefundAck: true, packageOption,
    } })
    created.registrations.push(reg.id)
    const r = await api('PATCH', `/api/registrations/${reg.id}`, { status: 'APPROVED' })
    if (r.json.memberId) created.members.push(r.json.memberId)
    const pkg = r.json.memberId ? await p.memberPackage.findFirst({ where: { memberId: r.json.memberId, endDate: null } }) : null
    ok(r.status === 200 && pkg?.sessionsTotal === expected, `${packageOption} → ${pkg?.sessionsTotal} sessions (want ${expected})`)
    if (label) ok(pkg?.packageType === label, `  package named "${pkg?.packageType}"`)
  }
  const noEmail = await p.notification.count({ where: { memberId: { in: created.members } } })
  ok(noEmail === 0, 'no approval email/notification for email-less registrations')

  const rej = await p.registration.create({ data: {
    parentName: 'ZZTest Parent', parentPhone: '000', whatsappConsent: false, childName: 'ZZTest Rejected',
    programOption: 'x', sport: 'Basketball', ageGroup: 'x', mediaConsent: false, injuryWaiver: true, noRefundAck: true, packageOption: '5_sessions',
  } })
  created.registrations.push(rej.id)
  const rr = await api('PATCH', `/api/registrations/${rej.id}`, { status: 'REJECTED' })
  ok(rr.status === 200 && rr.json.memberId === null, 'rejecting creates no member')
  ok((await api('PATCH', `/api/registrations/${rej.id}`, { status: 'BOGUS' })).status === 400, 'invalid status → 400')

  // ── Note 2: bulk reset ───────────────────────────────────────────────────
  console.log('\nNote 2 — reset sessions')
  // A student the sheet over-credited: package says 7, their registration says 5,
  // and they have two check-ins on the current package.
  const made = await api('POST', '/api/members', { firstName: 'ZZTest', lastName: 'Resetme', teamAssignment: 'Friday 5pm', sessionsTotal: 7, packageStartDate: '2020-01-01' })
  const resetId = made.json.id
  ok(made.status < 300 && resetId, 'created over-credited test member')
  if (resetId) created.members.push(resetId)
  const r2 = await p.registration.create({ data: {
    parentName: 'ZZTest Parent', parentPhone: '000', whatsappConsent: false, childName: 'ZZTest Resetme',
    programOption: 'basketball_5_sessions', sport: 'Basketball', ageGroup: 'x', mediaConsent: false, injuryWaiver: true,
    noRefundAck: true, packageOption: '5_sessions', status: 'APPROVED',
  } })
  created.registrations.push(r2.id)
  for (const date of ['2020-01-07', '2020-01-14']) {
    created.sessionDates.push(date)
    const a = await api('POST', '/api/attendance', { date, presentIds: [resetId], allMemberIds: [resetId] })
    ok(a.status === 200, `check-in ${date} recorded for the test member only`)
  }

  const blocked = s => s === 401 || s === 307
  ok(blocked((await api('GET', '/api/members/reset-sessions', undefined, { auth: false })).status), 'preview without login is blocked')
  ok(blocked((await api('POST', '/api/members/reset-sessions', { memberIds: [resetId] }, { auth: false })).status), 'apply without login is blocked')

  const prev = await api('GET', '/api/members/reset-sessions')
  const row = prev.json.rows?.find(x => x.memberId === resetId)
  ok(prev.status === 200 && row, 'preview lists the test member')
  ok(row?.currentUsed === 2 && row?.currentTotal === 7, `preview reads current ${row?.currentUsed}/${row?.currentTotal} (want 2/7)`)
  ok(row?.proposedTotal === 5 && row?.source === 'registration', `preview proposes ${row?.proposedTotal} from ${row?.source} (want 5 from registration)`)
  const pkgBeforeReset = await p.memberPackage.count()

  // The dangerous edge cases: none of these may write anything.
  for (const [body, why] of [
    [{ memberIds: [] }, 'empty memberIds'],
    [{ memberIds: 'all' }, 'memberIds not a list'],
    [{ memberIds: [resetId, 42] }, 'non-string id'],
    [{ memberIds: [resetId], startDate: '09/01/2026' }, 'bad startDate format'],
  ]) {
    const res = await api('POST', '/api/members/reset-sessions', body)
    ok(res.status === 400, `${why} → ${res.status} (want 400)`)
  }
  ok((await p.memberPackage.count()) === pkgBeforeReset, 'rejected requests wrote no packages')

  const unknownOnly = await api('POST', '/api/members/reset-sessions', { memberIds: ['does-not-exist'] })
  ok(unknownOnly.status === 200 && unknownOnly.json.reset === 0, 'unknown id resets nobody')
  ok((await p.memberPackage.count()) === pkgBeforeReset, '  …and wrote nothing')

  // Backdated before both check-ins: they count against the new package.
  const back = await api('POST', '/api/members/reset-sessions', { memberIds: [resetId], startDate: '2020-01-01' })
  let active = await p.memberPackage.findFirst({ where: { memberId: resetId, endDate: null } })
  ok(back.status === 200 && back.json.reset === 1, 'backdated reset touched exactly 1 member')
  ok(active?.sessionsTotal === 5 && active?.notes === 'Session count reset by staff', `total corrected to ${active?.sessionsTotal}, stamped as a reset`)
  ok((await p.memberPackage.count({ where: { memberId: resetId, endDate: null } })) === 1, 'exactly one active package after reset')

  // Today: the old check-ins stop counting, attendance rows are kept.
  const today = await api('POST', '/api/members/reset-sessions', { memberIds: [resetId] })
  const prev2 = await api('GET', '/api/members/reset-sessions')
  const row2 = prev2.json.rows?.find(x => x.memberId === resetId)
  ok(today.status === 200 && row2?.currentUsed === 0 && row2?.currentTotal === 5, `reset today reads ${row2?.currentUsed}/${row2?.currentTotal} (want 0/5)`)
  ok((await p.attendance.count({ where: { memberId: resetId } })) === 2, 'attendance history kept')

  // No real member's package moved.
  const realPkgs = before.memberPackage
  const nowPkgs = await p.memberPackage.findMany({ where: { id: { in: realPkgs.map(x => x.id) } } })
  const changed = nowPkgs.filter(x => JSON.stringify(x) !== JSON.stringify(realPkgs.find(y => y.id === x.id)))
  ok(nowPkgs.length === realPkgs.length && changed.length === 0, `real packages untouched (${changed.length} changed)`)

  // ── Note 4: a scoped attendance save only writes the students on screen ──
  console.log('\nNote 4 — scoped attendance')
  const vb = created.members[3] // ZZTest VballFive
  const bb = created.members[0] // ZZTest BballFive
  created.sessionDates.push('2020-01-21')
  const s = await api('POST', '/api/attendance', { date: '2020-01-21', presentIds: [bb], allMemberIds: [bb] })
  ok(s.status === 200, 'basketball-only save accepted')
  ok((await p.attendance.count({ where: { memberId: vb } })) === 0, 'volleyball student not marked absent from a basketball day')
}

async function cleanup() {
  const members = await p.member.findMany({ where: { firstName: { startsWith: 'ZZTest' } }, select: { id: true } })
  const ids = members.map(m => m.id)
  await p.attendance.deleteMany({ where: { memberId: { in: ids } } })
  await p.notification.deleteMany({ where: { memberId: { in: ids } } })
  await p.member.deleteMany({ where: { id: { in: ids } } }) // packages cascade
  await p.registration.deleteMany({ where: { childName: { startsWith: 'ZZTest' } } })
  for (const d of created.sessionDates) {
    const date = new Date(d + 'T00:00:00Z')
    const sess = await p.session.findUnique({ where: { date } })
    if (sess && (await p.attendance.count({ where: { sessionId: sess.id } })) === 0) await p.session.delete({ where: { id: sess.id } })
  }
}

let before
try {
  await main()
} catch (err) {
  failed++
  console.log('  ❌ crashed:', err.message)
} finally {
  await cleanup()
  before = JSON.parse(fs.readFileSync(process.env.DUMP_PATH ?? 'pre-test-dump.json', 'utf8'))
  const after = await dump()
  console.log('\nDiff against the pre-test dump')
  for (const t of TABLES) {
    const a = stable(before[t].map(r => JSON.parse(JSON.stringify(r)))), b = stable(after[t].map(r => JSON.parse(JSON.stringify(r))))
    const diffs = [...new Set([...a.keys(), ...b.keys()])].filter(k => a.get(k) !== b.get(k))
    ok(diffs.length === 0, `${t}: ${before[t].length} → ${after[t].length} rows, ${diffs.length} differing`)
  }
  await p.$disconnect()
  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
