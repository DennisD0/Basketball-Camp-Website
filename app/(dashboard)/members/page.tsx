import prisma from '@/lib/prisma'
import MemberTable from '@/components/members/member-table'
import Link from 'next/link'

export default async function MembersPage() {
  let members: Awaited<ReturnType<typeof prisma.member.findMany>> = []
  let paidIds: Set<string> = new Set()

  try {
    const [m, p] = await Promise.all([
      prisma.member.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { teamAssignment: 'asc' },
      }),
      prisma.payment.findMany({ select: { memberId: true } }),
    ])
    members = m
    paidIds = new Set(p.map(p => p.memberId))
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
        <Link
          href="/members/new"
          className="bg-brand-navy text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-brand-navy/90 active:scale-95 transition-all"
        >
          + Add Member
        </Link>
      </div>
      <MemberTable members={members} paidMemberIds={Array.from(paidIds)} />
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
