'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ArchiveMemberButton({ memberId }: { memberId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'archive' | 'delete' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleArchive() {
    if (!confirm('Archive this member? They will no longer appear in active rosters.')) return
    setLoading('archive')
    await fetch(`/api/members/${memberId}`, { method: 'DELETE' })
    router.push('/members')
    router.refresh()
  }

  async function handleDelete() {
    setLoading('delete')
    const res = await fetch(`/api/members/${memberId}?hard=true`, { method: 'DELETE' })
    if (!res.ok) { setLoading(null); setConfirmDelete(false); return }
    router.push('/members')
    router.refresh()
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={handleArchive}
          disabled={loading !== null}
          className="min-h-[44px] px-4 text-sm font-medium text-brand-orange border border-brand-orange rounded-xl hover:bg-brand-orange/5 disabled:opacity-50 transition-colors"
        >
          {loading === 'archive' ? 'Archiving…' : 'Archive'}
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          disabled={loading !== null}
          className="min-h-[44px] px-4 text-sm font-medium text-red-500 border border-red-300 rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Hard-delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => loading === null && setConfirmDelete(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-red-500">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h2 className="font-condensed font-bold text-xl text-brand-navy text-center mb-1">Delete profile?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              This member and all their attendance, payment, and notification records will be permanently deleted. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={loading === 'delete'}
                className="flex-1 min-h-[48px] rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading === 'delete'}
                className="flex-1 min-h-[48px] rounded-2xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading === 'delete' ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
