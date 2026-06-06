import { NextResponse } from 'next/server'

export function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('auth')
  return res
}
