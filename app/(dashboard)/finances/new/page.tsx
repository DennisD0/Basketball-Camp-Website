import prisma from '@/lib/prisma'
import Link from 'next/link'
import PaymentForm from '@/components/finances/payment-form'

export default async function NewPaymentPage() {
  const members = await prisma.member.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, firstName: true, lastName: true, teamAssignment: true },
    orderBy: [{ teamAssignment: 'asc' }, { lastName: 'asc' }],
  })

  return (
    <div>
      <div className="mb-6">
        <Link href="/finances" className="text-sm text-gray-500 hover:text-brand-navy mb-1 block">
          ← Finances
        </Link>
        <h1 className="text-2xl font-bold text-brand-navy">Record Payment</h1>
        <p className="text-sm text-gray-500 mt-1">Log a cash or bank transfer payment from a member.</p>
      </div>
      <PaymentForm members={members} />
    </div>
  )
}
