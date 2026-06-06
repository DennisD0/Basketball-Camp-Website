'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DeletePaymentButton({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete this payment record?')) return
    setLoading(true)
    await fetch(`/api/finances/payments/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
    >
      {loading ? '…' : 'Delete'}
    </button>
  )
}
