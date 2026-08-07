import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { backfillPackages } from '@/lib/packages'

/**
 * Reconcile package cycles with the Student & Packages sheet: create the missing
 * ones, recompute the ones a previous import created. Idempotent — the import
 * page calls it after every members/attendance upload.
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
