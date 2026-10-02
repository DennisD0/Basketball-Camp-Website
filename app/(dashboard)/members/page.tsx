import prisma from '@/lib/prisma'
import MemberTable, { type MemberSessions } from '@/components/members/member-table'
import Link from 'next/link'
import { summarizeSessions } from '@/lib/sessions'
import { packageWindow } from '@/lib/packages'
import ResetSessionsButton from '@/components/members/reset-sessions-button'
import CleanupSheetImportsButton from '@/components/members/cleanup-sheet-imports-button'

export default async function MembersPage() {
  let members: Awaited<ReturnType<typeof prisma.member.findMany>> = []
  let paidIds: Set<string> = new Set()
  let sessions: Record<string, MemberSessions> = {}

  try {
    // Active packages and check-ins come along so every card can show the same
    // figures the detail page does — computed by summarizeSessions, never here.
    const [m, p, activePackages, attendance] = await Promise.all([
      prisma.member.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { teamAssignment: 'asc' },
      }),
      prisma.payment.findMany({ select: { memberId: true } }),
      prisma.memberPackage.findMany({ where: { endDate: null } }),
      prisma.attendance.findMany({
        where: { status: 'PRESENT' },
        select: { memberId: true, session: { select: { date: true } } },
      }),
    ])
    members = m
    paidIds = new Set(p.map(p => p.memberId))

    const packageByMember = new Map(activePackages.map(pkg => [pkg.memberId, pkg]))
    const datesByMember = new Map<string, Date[]>()
    for (const a of attendance) {
      const arr = datesByMember.get(a.memberId)
      if (arr) arr.push(a.session.date)
      else datesByMember.set(a.memberId, [a.session.date])
    }

    sessions = Object.fromEntries(members.map(member => {
      const s = summarizeSessions(
        member,
        packageWindow(packageByMember.get(member.id) ?? null),
        datesByMember.get(member.id) ?? [],
      )
      return [member.id, {
        total:     s.total,
        used:      s.used,
        remaining: s.remaining,
        // Serialized for the client component; rendered through asLocalDate so
        // a UTC-midnight date does not slip back a day in New York.
        startDate: s.startDate?.toISOString() ?? null,
        expiresOn: s.expiresOn?.toISOString() ?? null,
      }]
    }))
  } catch {
    return <EmptyState message="Could not reach the database. Add your DATABASE_URL in Vercel environment variables and redeploy." />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-condensed font-bold text-2xl text-brand-navy tracking-wide">Members</h1>
          <p className="text-sm text-gray-400 mt-0.5">{members.length} active member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <CleanupSheetImportsButton />
          <ResetSessionsButton />
          <Link
            href="/members/new"
            className="bg-brand-navy text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-brand-navy/90 active:scale-95 transition-all"
          >
            + Add Member
          </Link>
        </div>
      </div>
      <MemberTable members={members} paidMemberIds={Array.from(paidIds)} sessions={sessions} />
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-gray-300">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
          <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
        </svg>
      </div>
      <h2 className="font-condensed font-bold text-xl text-brand-navy mb-1">No data yet</h2>
      <p className="text-sm text-gray-400 max-w-sm">{message}</p>
    </div>
  )
}
