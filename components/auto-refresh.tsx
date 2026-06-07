'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Keeps a server-rendered page in sync with changes made from other tabs
 * (e.g. a new public registration landing while staff has /registrations open).
 * Polls router.refresh() on an interval and immediately when the tab regains focus.
 */
export default function AutoRefresh({ intervalMs = 8000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }

    const id = setInterval(refreshIfVisible, intervalMs)
    window.addEventListener('focus', refreshIfVisible)
    document.addEventListener('visibilitychange', refreshIfVisible)

    return () => {
      clearInterval(id)
      window.removeEventListener('focus', refreshIfVisible)
      document.removeEventListener('visibilitychange', refreshIfVisible)
    }
  }, [router, intervalMs])

  return null
}
