import prisma from '@/lib/prisma'
import MemberTable from '@/components/members/member-table'
import Link from 'next/link'

export default async function MembersPage() {
  const [members, paidIds] = await Promise.all([
    prisma.member.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { teamAssignment: 'asc' },
    }),
    prisma.payment.findMany({ select: { memberId: true } }).then(
      ps => new Set(ps.map(p => p.memberId))
    ),
  ])

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
