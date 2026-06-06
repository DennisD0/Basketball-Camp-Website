import type { Member } from '@prisma/client'
import Link from 'next/link'

export default function FlaggedMembers({ members }: { members: Member[] }) {
  // Mock: first 3 members flagged with varying absences (real flagging comes in Milestone 4)
  const flagged = members.slice(0, 3).map((m, i) => ({
    ...m,
    absences: [3, 2, 2][i] ?? 2,
    feePaid: true,
  }))

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-gray-800">Needs Attention</h2>
          <p className="text-xs text-gray-400 mt-0.5">Paid but missing practices</p>
        </div>
        <span className="text-xs bg-brand-orange/10 text-brand-orange font-semibold px-2.5 py-1 rounded-full">
          {flagged.length} flagged
        </span>
      </div>

      <div className="space-y-2">
        {flagged.map((m) => (
          <Link
            key={m.id}
            href={`/members/${m.id}`}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-[#F4F2EE] transition-all duration-150 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold text-sm flex-shrink-0">
                {m.firstName[0]}{m.lastName[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 group-hover:text-brand-navy transition-colors">
                  {m.firstName} {m.lastName}
                </p>
                <p className="text-xs text-gray-400">{m.teamAssignment}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-brand-orange">{m.absences} absences</p>
              <p className="text-xs text-gray-400">this month</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
