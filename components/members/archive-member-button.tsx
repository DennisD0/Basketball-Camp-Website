'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ArchiveMemberButton({ memberId }: { memberId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleArchive() {
    if (!confirm('Archive this member? They will no longer appear in active rosters.')) return
    setLoading(true)
    await fetch(`/api/members/${memberId}`, { method: 'DELETE' })
    router.push('/members')
    router.refresh()
  }

  return (
    <button
      onClick={handleArchive}
      disabled={loading}
      className="px-4 py-2 text-sm font-medium text-brand-orange border border-brand-orange rounded-lg hover:bg-brand-orange/5 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Archiving…' : 'Archive'}
    </button>
  )
}
