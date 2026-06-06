import type { Member } from '@prisma/client'
import Link from 'next/link'

export default function RecentMembers({ members }: { members: Member[] }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-gray-800">Recently Added</h2>
          <p className="text-xs text-gray-400 mt-0.5">Newest members</p>
        </div>
        <Link
          href="/members"
          className="text-sm text-brand-teal hover:text-brand-navy font-medium transition-colors"
        >
          View all →
        </Link>
      </div>
      <div className="divide-y divide-gray-50">
        {members.map((m) => (
          <Link
            key={m.id}
            href={`/members/${m.id}`}
            className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:bg-gray-50 -mx-2 px-2 rounded-xl transition-all duration-150 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy font-semibold text-sm flex-shrink-0 group-hover:bg-brand-navy/15 transition-colors">
                {m.firstName[0]}{m.lastName[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 group-hover:text-brand-navy transition-colors">
                  {m.firstName} {m.lastName}
                </p>
                <p className="text-xs text-gray-400">{m.teamAssignment ?? '—'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">
                {new Date(m.enrollmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
              <p className="text-xs text-brand-teal font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                View profile →
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
