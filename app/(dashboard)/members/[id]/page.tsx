import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ArchiveMemberButton from '@/components/members/archive-member-button'
import EmailParentButton from '@/components/members/email-parent-button'

const AVATAR_COLORS = [
  'from-brand-navy to-brand-teal', 'from-purple-600 to-indigo-500',
  'from-emerald-600 to-teal-500', 'from-blue-600 to-cyan-500',
]
function avatarGrad(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider flex-shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-gray-800 text-right">{value}</dd>
    </div>
  )
}

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [member, payments, allAttendance] = await Promise.all([
    prisma.member.findUnique({ where: { id } }),
    prisma.payment.findMany({ where: { memberId: id }, orderBy: { date: 'desc' } }),
    prisma.attendance.findMany({
      where: { memberId: id, status: 'PRESENT' },
      include: { session: true },
      orderBy: { session: { date: 'asc' } },
    }),
  ])
  if (!member) notFound()

  const age = member.dateOfBirth
    ? Math.floor((Date.now() - new Date(member.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0)
  // Sessions used = whichever is higher: logged attendance, or the count
  // carried over from the Student & Packages sheet (sessions burned before
  // check-in tracking started).
  const attendedCount = allAttendance.length
  const sessionsUsed = member.sessionsUsed
  const sessionsRemaining = Math.max(0, member.sessionsTotal - sessionsUsed)
  const sessionsPct = Math.min(Math.round((sessionsUsed / Math.max(member.sessionsTotal, 1)) * 100), 100)

  const sessionStatus = sessionsRemaining === 0
    ? { color: 'text-red-500', bar: 'bg-red-400', bg: 'bg-red-50', msg: 'All sessions used — renewal needed.', msgColor: 'text-red-500' }
    : sessionsRemaining <= 2
    ? { color: 'text-orange-500', bar: 'bg-orange-400', bg: 'bg-orange-50', msg: 'Running low — consider notifying the parent.', msgColor: 'text-orange-500' }
    : { color: 'text-brand-teal', bar: 'bg-brand-teal', bg: 'bg-brand-teal/10', msg: '', msgColor: '' }

  // Monthly mini-calendar
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' })
  const today = new Date().toISOString().slice(0, 10)

  const thisMonthSet = new Set(
    allAttendance
      .filter(a => {
        const d = a.session.date
        return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month
      })
      .map(a => a.session.date.toISOString().slice(0, 10))
  )

  const firstDow = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const calCells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (calCells.length % 7 !== 0) calCells.push(null)

  const fullName = `${member.firstName} ${member.lastName}`.trim()
  const initials = `${member.firstName[0] ?? ''}${member.lastName?.[0] ?? ''}`.toUpperCase()
  const grad = avatarGrad(fullName)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back */}
      <Link
        href="/members"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-brand-navy transition-colors mb-4"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Members
      </Link>

      {/* Hero card */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-xl font-bold text-white flex-shrink-0 shadow-sm`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-condensed font-bold text-2xl text-brand-navy tracking-wide leading-tight">
              {fullName}
            </h1>
            {member.teamAssignment && (
              <span className="inline-block mt-1 text-xs font-semibold bg-brand-teal/10 text-brand-teal px-2.5 py-1 rounded-full">
                {member.teamAssignment}
              </span>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {member.status === 'ACTIVE' ? '● Active' : '○ Archived'} · Enrolled {new Date(member.enrollmentDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Link
              href={`/members/${id}/edit`}
              className="px-3.5 py-1.5 text-xs font-semibold text-brand-navy border border-brand-navy/20 rounded-lg hover:bg-brand-navy/5 active:bg-brand-navy/10 transition-all"
            >
              Edit
            </Link>
            <ArchiveMemberButton memberId={id} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Sessions card */}
        <div className={`${sessionStatus.bg} rounded-2xl p-5 ring-1 ring-black/5`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Sessions Remaining</p>
          <div className="flex items-end gap-1.5 mb-3">
            <span className={`text-5xl font-condensed font-bold leading-none ${sessionStatus.color}`}>{sessionsRemaining}</span>
            <span className="text-sm text-gray-400 mb-1">/ {member.sessionsTotal}</span>
          </div>
          <div className="w-full bg-white/60 rounded-full h-2 mb-2">
            <div className={`h-2 rounded-full transition-all ${sessionStatus.bar}`} style={{ width: `${sessionsPct}%` }} />
          </div>
          <p className="text-xs text-gray-500">
            {sessionsUsed} sessions used · {attendedCount} logged in app
          </p>
          {sessionStatus.msg && (
            <p className={`text-xs font-semibold mt-2 ${sessionStatus.msgColor}`}>{sessionStatus.msg}</p>
          )}
        </div>

        {/* Mini calendar */}
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Attendance</p>
          <p className="text-sm font-bold text-brand-navy mb-3">{monthName} {year}</p>

          <div className="grid grid-cols-7 mb-1">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-gray-300">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {calCells.map((day, i) => {
              if (!day) return <div key={i} />
              const ds = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const attended = thisMonthSet.has(ds)
              const isToday = ds === today
              return (
                <div
                  key={i}
                  className={[
                    'aspect-square flex items-center justify-center rounded-lg text-[11px] font-semibold',
                    isToday ? 'ring-1 ring-brand-navy' : '',
                    attended ? 'bg-brand-teal text-white' : 'text-gray-300',
                  ].join(' ')}
                >
                  {day}
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">{thisMonthSet.size} session{thisMonthSet.size !== 1 ? 's' : ''} this month</p>
        </div>

        {/* Player info */}
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Player Info</p>
          <dl>
            <InfoRow label="Age" value={age !== null ? `${age} yrs old` : '—'} />
            <InfoRow label="Date of birth" value={member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : '—'} />
            <InfoRow label="Team" value={member.teamAssignment ?? '—'} />
          </dl>
        </div>

        {/* Guardian */}
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Guardian</p>
          <dl className="mb-4">
            <InfoRow label="Name" value={member.guardianName ?? '—'} />
            <InfoRow label="Email" value={member.guardianEmail ?? '—'} />
            <InfoRow label="Phone" value={member.guardianPhone ?? '—'} />
          </dl>
          <EmailParentButton
            memberId={id}
            playerName={fullName}
            guardianName={member.guardianName ?? ''}
            guardianEmail={member.guardianEmail}
            team={member.teamAssignment}
          />
        </div>

        {/* Attendance history */}
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5 sm:col-span-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">All Attendance Dates</p>
          {allAttendance.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No sessions attended yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {allAttendance.map((a, i) => {
                const ds = a.session.date.toISOString().slice(0, 10)
                const label = new Date(ds + 'T12:00:00Z').toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                })
                return (
                  <Link
                    key={a.id}
                    href={`/attendance/${ds}`}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-brand-teal/8 hover:bg-brand-teal/15 transition-colors group"
                  >
                    <span className="w-5 h-5 rounded-full bg-brand-teal flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs font-semibold text-brand-teal group-hover:text-brand-teal/80 truncate">{label}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Payments */}
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5 sm:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payments</p>
              <p className="text-lg font-condensed font-bold text-brand-navy mt-0.5">${totalPaid.toFixed(2)} <span className="text-sm font-normal text-gray-400">total paid</span></p>
            </div>
            <Link
              href="/finances/new"
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-teal hover:text-brand-teal/80 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add payment
            </Link>
          </div>
          {payments.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-gray-400">No payments recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">${Number(p.amount).toFixed(2)}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(new Date(p.date).toISOString().slice(0,10) + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {p.notes ? ` · ${p.notes}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    p.method === 'CASH' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {p.method === 'CASH' ? 'Cash' : 'Bank'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
