import Link from 'next/link'

export default function RegistrationStats({
  pending,
  approved,
  rejected,
}: {
  pending: number
  approved: number
  rejected: number
}) {
  const total = pending + approved + rejected
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0

  // SVG semi-circle arc — circumference of a half-circle with r=50 is ~157
  const filled = (approvalRate / 100) * 157

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-black/5">
      <h2 className="font-semibold text-gray-800 mb-0.5">Registrations</h2>
      <p className="text-xs text-gray-400 mb-5">Approval rate this season</p>

      {/* Arc gauge */}
      <div className="flex justify-center mb-5">
        <div className="relative" style={{ width: 140, height: 76 }}>
          <svg viewBox="0 0 120 64" width="140" height="76">
            {/* track */}
            <path
              d="M 10 60 A 50 50 0 0 1 110 60"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* fill */}
            <path
              d="M 10 60 A 50 50 0 0 1 110 60"
              fill="none"
              stroke="#2D3875"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${filled} 157`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-0.5">
            <p className="text-2xl font-bold text-gray-900">{approvalRate}%</p>
            <p className="text-xs text-gray-400">approved</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {([
          { label: 'Pending review', count: pending,  dot: 'bg-brand-orange', badge: 'bg-brand-orange/10 text-brand-orange' },
          { label: 'Approved',       count: approved, dot: 'bg-brand-teal',   badge: 'bg-brand-teal/10 text-brand-teal'   },
          { label: 'Rejected',       count: rejected, dot: 'bg-gray-300',     badge: 'bg-gray-100 text-gray-400'          },
        ] as const).map(({ label, count, dot, badge }) => (
          <div key={label} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              <p className="text-sm text-gray-600">{label}</p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${badge}`}>{count}</span>
          </div>
        ))}
      </div>

      {pending > 0 && (
        <Link
          href="/registrations"
          className="mt-4 block text-center text-xs font-semibold text-brand-teal hover:text-brand-navy transition-colors py-2"
        >
          Review {pending} pending →
        </Link>
      )}
    </div>
  )
}
