import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ArchiveMemberButton from '@/components/members/archive-member-button'
import EmailParentButton from '@/components/members/email-parent-button'

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [member, payments] = await Promise.all([
    prisma.member.findUnique({ where: { id } }),
    prisma.payment.findMany({ where: { memberId: id }, orderBy: { date: 'desc' } }),
  ])
  if (!member) notFound()

  const age = member.dateOfBirth
    ? Math.floor((Date.now() - new Date(member.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/members" className="text-sm text-gray-500 hover:text-brand-navy mb-1 block">
            ← Members
          </Link>
          <h1 className="text-2xl font-bold text-brand-navy">
            {member.firstName} {member.lastName}
          </h1>
          {member.teamAssignment && (
            <span className="inline-block mt-1 text-sm bg-brand-teal/10 text-brand-teal px-2.5 py-0.5 rounded-full">
              {member.teamAssignment}
            </span>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <Link
            href={`/members/${id}/edit`}
            className="px-4 py-2 text-sm font-medium text-brand-navy border border-brand-navy rounded-full hover:bg-brand-navy/5 transition-colors"
          >
            Edit
          </Link>
          <ArchiveMemberButton memberId={id} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Player info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="font-semibold text-brand-navy mb-4">Player Info</h2>
          <dl className="space-y-3">
            <Row label="Full name" value={`${member.firstName} ${member.lastName}`} />
            <Row label="Age" value={age !== null ? `${age} years old` : '—'} />
            <Row label="Date of birth" value={member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : '—'} />
            <Row label="Team" value={member.teamAssignment ?? '—'} />
            <Row label="Enrolled" value={new Date(member.enrollmentDate).toLocaleDateString()} />
            <Row label="Status" value={member.status} />
          </dl>
        </div>

        {/* Guardian info + email */}
        <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="font-semibold text-brand-navy mb-4">Guardian Info</h2>
          <dl className="space-y-3 mb-6">
            <Row label="Name" value={member.guardianName ?? '—'} />
            <Row label="Email" value={member.guardianEmail ?? '—'} />
            <Row label="Phone" value={member.guardianPhone ?? '—'} />
          </dl>
          <h3 className="font-medium text-gray-700 mb-3 text-sm">Notify Parent</h3>
          <EmailParentButton
            memberId={id}
            playerName={`${member.firstName} ${member.lastName}`}
            guardianName={member.guardianName ?? ''}
            guardianEmail={member.guardianEmail}
            team={member.teamAssignment}
          />
        </div>

        {/* Payments */}
        <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-black/5 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-brand-navy">Payments</h2>
              <p className="text-xs text-gray-400 mt-0.5">Total paid: <span className="font-semibold text-brand-teal">${totalPaid.toFixed(2)}</span></p>
            </div>
            <Link
              href={`/finances/new`}
              className="text-sm text-brand-teal hover:underline"
            >
              + Add payment
            </Link>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-400">No payments recorded.</p>
          ) : (
            <div className="space-y-2">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">${Number(p.amount).toFixed(2)}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {p.notes ? ` — ${p.notes}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    p.method === 'CASH' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {p.method === 'CASH' ? 'Cash' : 'Bank Transfer'}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  )
}
