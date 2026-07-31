/**
 * Shared helpers for stress-test-imports.mjs and simulate-5-weeks.mjs.
 * Import with: import { login, api, pass, fail, info, warn, section } from './lib.mjs'
 */

const BASE = 'http://localhost:3000'
let _cookie = ''

export function pass(msg)  { console.log(`  ✅ ${msg}`) }
export function fail(msg)  { console.log(`  ❌ ${msg}`) }
export function info(msg)  { console.log(`  ℹ  ${msg}`) }
export function warn(msg)  { console.log(`  ⚠  ${msg}`) }
export function section(t) { console.log(`\n${'─'.repeat(60)}\n${t}\n${'─'.repeat(60)}`) }

export async function login(password = '1234') {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) { fail('Login failed — is the server running at localhost:3000?'); process.exit(1) }
  _cookie = (res.headers.get('set-cookie') ?? '').split(';')[0]
  pass(`Logged in · cookie: ${_cookie}`)
  return _cookie
}

export async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: _cookie },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = { raw: text } }
  return { ok: res.ok, status: res.status, json }
}
