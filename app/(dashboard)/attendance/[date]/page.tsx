import prisma from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import TakeAttendance from '@/components/attendance/take-attendance'
import { avatarColor } from '@/lib/avatar'

function sessionColor(remaining: number) {
  if (remaining === 0) return { bar: 'bg-red-400', text: 'text-red-500', badge: 'bg-red-50 text-red-600' }
  if (remaining <= 2) return { bar: 'bg-orange-400', text: 'text-orange-500', badge: 'bg-orange-50 text-orange-600' }
  return { bar: 'bg-brand-teal', text: 'text-brand-teal', badge: 'bg-brand-teal/10 text-brand-teal' }
}

export default async function AttendanceDatePage({
  params,
  searchParams,
}: {
  params: Promise<{ date: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { date } = await params
  const { tab } = await searchParams
  const activeTab = tab === 'take' ? 'take' : 'view'

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()

  const dayStart = new Date(date + 'T00:00:00Z')
  const dayEnd = new Date(date + 'T00:00:00Z')
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)

  const [sessions, activeMembers] = await Promise.all([
    prisma.session.findMany({
      where: { date: { gte: dayStart, lt: dayEnd } },
      include: {
        attendance: {
          where: { status: 'PRESENT' },
          include: { member: true },
        },
      },
    }),
    prisma.member.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, teamAssignment: true },
    }),
  ])

  // Build attendee list for "view" tab
  const memberMap = new Map<string, typeof sessions[0]['attendance'][0]['member']>()
  for (const session of sessions) {
    for (const record of session.attendance) {
      if (!memberMap.has(record.memberId)) memberMap.set(record.memberId, record.member)
    }
  }

  const memberIds = Array.from(memberMap.keys())
  const countRows = await prisma.attendance.groupBy({
    by: ['memberId'],
    where: { memberId: { in: memberIds }, status: 'PRESENT' },
    _count: { memberId: true },
  })
  const countByMember = Object.fromEntries(countRows.map(r => [r.memberId, r._count.memberId]))

  const attendees = Array.from(memberMap.values())
    .map(member => ({ member, sessionsAttended: countByMember[member.id] ?? 0 }))
    .sort((a, b) => a.member.firstName.localeCompare(b.member.firstName))

  const label = new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back + header */}
      <div className="mb-6">
        <Link
          href="/attendance"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-brand-navy transition-colors mb-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Attendance Calendar
        </Link>
        <h1 className="font-condensed font-bold text-2xl text-brand-navy tracking-wide">{label}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        <Link
          href={`/attendance/${date}`}
          className={`flex-1 text-center text-sm font-semibold py-2 rounded-lg transition-all ${
            activeTab === 'view' ? 'bg-white text-brand-navy shadow-sm' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          View Attendance
        </Link>
        <Link
          href={`/attendance/${date}?tab=take`}
          className={`flex-1 text-center text-sm font-semibold py-2 rounded-lg transition-all ${
            activeTab === 'take' ? 'bg-white text-brand-navy shadow-sm' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Take Attendance
        </Link>
      </div>

      {activeTab === 'take' ? (
        <TakeAttendance date={date} members={activeMembers} />
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-4">
            {attendees.length === 0
              ? 'No attendance recorded for this date.'
              : `${attendees.length} student${attendees.length !== 1 ? 's' : ''} attended`}
          </p>

          {attendees.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm ring-1 ring-black/5">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7 text-gray-300">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium text-sm">No attendance yet</p>
              <p className="text-gray-400 text-xs mt-1">
                <Link href={`/attendance/${date}?tab=take`} className="text-brand-teal hover:underline">Take attendance</Link> to record today&apos;s session.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {attendees.map(({ member, sessionsAttended }, idx) => {
                const used = member.sessionsUsed
                const remaining = Math.max(0, member.sessionsTotal - used)
                const pct = Math.min(Math.round((used / Math.max(member.sessionsTotal, 1)) * 100), 100)
                const colors = sessionColor(remaining)
                const initials = `${member.firstName[0] ?? ''}${member.lastName?.[0] ?? ''}`.toUpperCase()
                const bg = avatarColor(member.firstName + member.lastName)

                return (
                  <Link
                    key={member.id}
                    href={`/members/${member.id}`}
                    className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-black/5 hover:shadow-md hover:ring-brand-teal/20 active:scale-[0.99] transition-all duration-150 flex items-center gap-4"
                  >
                    <div className="relative flex-shrink-0">
                      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center text-sm font-bold text-white`}>
                        {initials}
                      </div>
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full text-[9px] font-bold text-gray-400 flex items-center justify-center shadow-sm ring-1 ring-black/5">
                        {idx + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {member.firstName} {member.lastName}
                        </p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${colors.badge}`}>
                          {remaining} left
                        </span>
                      </div>
                      {member.teamAssignment && (
                        <p className="text-xs text-gray-400 mb-1.5">{member.teamAssignment}</p>
                      )}
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${colors.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{used}/{member.sessionsTotal} sessions used</p>
                    </div>

                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-300 flex-shrink-0">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
