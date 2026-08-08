'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PACKAGE_PRESETS, DEFAULT_PRESET, todayISO } from '@/lib/package-presets'

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
  const isNew = !memberId
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Package fields apply to creation only. Editing a member must not silently
  // restart their package — that is what the "New package" button on the member
  // page is for, and it is the one place that closes the previous package.
  const [preset, setPreset] = useState(DEFAULT_PRESET)
  const [customSessions, setCustomSessions] = useState('')
  const [packageStartDate, setPackageStartDate] = useState(todayISO)

  const sessionsTotal = customSessions.trim() ? parseInt(customSessions, 10) : preset.sessions
  const packageValid = Number.isInteger(sessionsTotal) && sessionsTotal >= 1 && sessionsTotal <= 100

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
    if (isNew && !packageValid) {
      setError('Sessions must be a whole number between 1 and 100')
      return
    }
    setLoading(true)
    setError(null)

    const payload = isNew
      ? {
          ...data,
          sessionsTotal,
          packageType: customSessions.trim() ? null : preset.type,
          packageStartDate,
        }
      : data

    const res = await fetch(memberId ? `/api/members/${memberId}` : '/api/members', {
      method: memberId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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

      {isNew && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-brand-navy mb-1">Package</h2>
          <p className="text-xs text-gray-500 mb-4">
            Starts their first package so check-ins count down from day one.
          </p>

          <label className={label}>Sessions</label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {PACKAGE_PRESETS.map(p => {
              const active = !customSessions.trim() && preset.label === p.label
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => { setPreset(p); setCustomSessions('') }}
                  className={`min-h-[52px] rounded-lg border text-sm font-medium transition-all active:scale-95 ${
                    active
                      ? 'border-brand-teal bg-brand-teal/10 text-brand-teal'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="customSessions" className={label}>Or a custom number</label>
              <input
                id="customSessions"
                type="number"
                min={1}
                max={100}
                value={customSessions}
                onChange={e => setCustomSessions(e.target.value)}
                placeholder="e.g. 10"
                className={input}
              />
            </div>
            <div>
              <label htmlFor="packageStartDate" className={label}>Package start date</label>
              <input
                id="packageStartDate"
                type="date"
                value={packageStartDate}
                onChange={e => setPackageStartDate(e.target.value)}
                className={input}
              />
              <p className="text-xs text-gray-400 mt-1">
                Backdate this if they already started attending.
              </p>
            </div>
          </div>
        </div>
      )}

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
