import prisma from '@/lib/prisma'
import Link from 'next/link'
import PaymentForm from '@/components/finances/payment-form'

/**
 * `?member=<id>` arrives from the Add payment button on a student's profile.
 *
 * Reaching that button means the student has already been chosen — their name
 * is at the top of the page it was pressed on — so asking again, from a
 * dropdown of the whole roster on a phone, is work the app made up. The form
 * opens on them, and goes back to their profile when it is done.
 */
export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>
}) {
  const { member: memberId } = await searchParams

  const [members, preselected] = await Promise.all([
    prisma.member.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, teamAssignment: true },
      orderBy: [{ teamAssignment: 'asc' }, { lastName: 'asc' }],
    }),
    // Looked up separately and without a status filter: a payment can land
    // against a student who has since been archived, and dropping them here
    // would silently reopen the roster dropdown with no explanation.
    memberId
      ? prisma.member.findUnique({
          where: { id: memberId },
          select: { id: true, firstName: true, lastName: true, teamAssignment: true },
        })
      : null,
  ])

  const options = preselected && !members.some(m => m.id === preselected.id)
    ? [preselected, ...members]
    : members

  const name = preselected ? `${preselected.firstName} ${preselected.lastName}`.trim() : null

  return (
    <div>
      <div className="mb-6">
        <Link
          href={preselected ? `/members/${preselected.id}` : '/finances'}
          className="text-sm text-gray-500 hover:text-brand-navy mb-1 block"
        >
          ← {name ?? 'Finances'}
        </Link>
        <h1 className="text-2xl font-bold text-brand-navy">Record Payment</h1>
        <p className="text-sm text-gray-500 mt-1">
          {name
            ? `Log a cash or bank transfer payment from ${name}.`
            : 'Log a cash or bank transfer payment from a member.'}
        </p>
      </div>
      <PaymentForm
        members={options}
        initialMemberId={preselected?.id ?? null}
        returnTo={preselected ? `/members/${preselected.id}` : '/finances'}
      />
    </div>
  )
}
