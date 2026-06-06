'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ApproveRegistrationButton({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function update(status: 'APPROVED' | 'REJECTED') {
    setLoading(status)
    await fetch(`/api/registrations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => update('APPROVED')}
        disabled={!!loading}
        className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-full hover:bg-green-100 transition-all disabled:opacity-50"
      >
        {loading === 'APPROVED' ? '…' : 'Approve'}
      </button>
      <button
        onClick={() => update('REJECTED')}
        disabled={!!loading}
        className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-all disabled:opacity-50"
      >
        {loading === 'REJECTED' ? '…' : 'Reject'}
      </button>
    </div>
  )
}
