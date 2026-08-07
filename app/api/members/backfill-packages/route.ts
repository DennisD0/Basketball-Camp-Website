import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { backfillPackages } from '@/lib/packages'

/**
 * Give every member without an active package one, reconstructed from their
 * sheet counts + check-in history. Idempotent — safe to re-run after an import.
 */
export async function POST() {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await backfillPackages()
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
