'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type FormData = {
  firstName: string
  lastName: string
  dateOfBirth: string
  teamAssignment: string
  enrollmentDate: string
  guardianName: string
  guardianEmail: string
  guardianPhone: string
}

type Props = {
  initialData?: Partial<FormData>
  memberId?: string
}

export default function MemberForm({ initialData, memberId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<FormData>({
    firstName:      initialData?.firstName      ?? '',
    lastName:       initialData?.lastName       ?? '',
    dateOfBirth:    initialData?.dateOfBirth    ?? '',
    teamAssignment: initialData?.teamAssignment ?? '',
    enrollmentDate: initialData?.enrollmentDate ?? new Date().toISOString().split('T')[0],
    guardianName:   initialData?.guardianName   ?? '',
    guardianEmail:  initialData?.guardianEmail  ?? '',
    guardianPhone:  initialData?.guardianPhone  ?? '',
  })

  function field(key: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setData((prev) => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch(memberId ? `/api/members/${memberId}` : '/api/members', {
      method: memberId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    router.push('/members')
    router.refresh()
  }

  const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm'
  const label = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="font-semibold text-brand-navy mb-4">Player Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className={label}>First name *</label>
            <input id="firstName" type="text" value={data.firstName} onChange={field('firstName')} required className={input} />
          </div>
          <div>
            <label htmlFor="lastName" className={label}>Last name *</label>
            <input id="lastName" type="text" value={data.lastName} onChange={field('lastName')} required className={input} />
          </div>
          <div>
            <label htmlFor="dateOfBirth" className={label}>Date of birth</label>
            <input id="dateOfBirth" type="date" value={data.dateOfBirth} onChange={field('dateOfBirth')} className={input} />
          </div>
          <div>
            <label htmlFor="teamAssignment" className={label}>Team</label>
            <input id="teamAssignment" type="text" value={data.teamAssignment} onChange={field('teamAssignment')} placeholder="e.g. U14 Boys" className={input} />
          </div>
          <div>
            <label htmlFor="enrollmentDate" className={label}>Enrollment date *</label>
            <input id="enrollmentDate" type="date" value={data.enrollmentDate} onChange={field('enrollmentDate')} required className={input} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="font-semibold text-brand-navy mb-4">Guardian Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="guardianName" className={label}>Guardian name</label>
            <input id="guardianName" type="text" value={data.guardianName} onChange={field('guardianName')} className={input} />
          </div>
          <div>
            <label htmlFor="guardianEmail" className={label}>Guardian email</label>
            <input id="guardianEmail" type="email" value={data.guardianEmail} onChange={field('guardianEmail')} className={input} />
          </div>
          <div>
            <label htmlFor="guardianPhone" className={label}>Guardian phone</label>
            <input id="guardianPhone" type="tel" value={data.guardianPhone} onChange={field('guardianPhone')} className={input} />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-brand-orange">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-brand-navy text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-navy/90 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving…' : memberId ? 'Save changes' : 'Add member'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
