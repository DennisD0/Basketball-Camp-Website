import prisma from '@/lib/prisma'
import { describeDbError } from '@/lib/db-error'
import EmptyState from '@/components/ui/empty-state'
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
  } catch (err) {
    const failure = describeDbError(err)
    console.error('[members/page]', err)
    return <EmptyState title="Could not load this page" message={failure.message} hint={failure.hint} />
  }

  return (
    <div>
      {/* Three buttons and a title do not fit across a phone. Add Member stays
          on the title row because it is the one a coach actually reaches for;
          the two bulk tools drop to their own row underneath and rejoin the
          line once there is room for them. */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-condensed font-bold text-2xl text-brand-navy tracking-wide">Members</h1>
            <p className="text-sm text-gray-400 mt-0.5">{members.length} active member{members.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <CleanupSheetImportsButton />
              <ResetSessionsButton />
            </div>
            <Link
              href="/members/new"
              className="bg-brand-navy text-white px-4 py-2.5 rounded-full text-sm font-medium hover:bg-brand-navy/90 active:scale-95 transition-all whitespace-nowrap min-h-[44px] flex items-center"
            >
              + Add<span className="hidden sm:inline">&nbsp;Member</span>
            </Link>
          </div>
        </div>
        <div className="flex sm:hidden items-center gap-2 mt-3">
          <CleanupSheetImportsButton />
          <ResetSessionsButton />
        </div>
      </div>
      <MemberTable members={members} paidMemberIds={Array.from(paidIds)} sessions={sessions} />
    </div>
  )
}
