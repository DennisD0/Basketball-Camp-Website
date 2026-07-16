import prisma from '@/lib/prisma'
import Link from 'next/link'
import DeletePaymentButton from '@/components/finances/delete-payment-button'
import FinanceCharts from '@/components/finances/finance-charts'

export default async function FinancesPage() {
  const payments = await prisma.payment.findMany({
    include: { member: { select: { id: true, firstName: true, lastName: true, teamAssignment: true } } },
    orderBy: { date: 'desc' },
  })

  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  const now = new Date()
  const thisMonth = payments
    .filter(p => {
      const d = new Date(p.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const activeMembers = await prisma.member.count({ where: { status: 'ACTIVE' } })
  const paidMemberIds = new Set(payments.map(p => p.memberId))
  const unpaidCount   = Math.max(0, activeMembers - paidMemberIds.size)

  // Serialize for client chart component
  const chartPayments = payments.map(p => ({
    amount: Number(p.amount),
    method: p.method,
    date: p.date.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-condensed font-bold text-2xl text-brand-navy tracking-wide">Finances</h1>
        <Link
          href="/finances/new"
          className="bg-brand-teal text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-brand-teal/90 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
        >
          + Record Payment
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Total Collected" value={`$${total.toLocaleString()}`} color="teal" />
        <SummaryCard label="This Month"      value={`$${thisMonth.toLocaleString()}`} color="navy" />
        <SummaryCard label="Members Unpaid"  value={String(unpaidCount)} color="orange" />
      </div>

      {/* Charts */}
      <FinanceCharts payments={chartPayments} />

      {/* Payment history */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Payment History</h2>
            <p className="text-xs text-gray-400 mt-0.5">{payments.length} records</p>
          </div>
        </div>
        {payments.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            No payments recorded yet.{' '}
            <Link href="/finances/new" className="text-brand-teal hover:underline">Record the first one.</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F4F2EE]">
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Member</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Team</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Amount</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Method</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Notes</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-[#F4F2EE]/60 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <Link href={`/members/${p.member.id}`} className="hover:text-brand-teal transition-colors">
                        {p.member.firstName} {p.member.lastName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{p.member.teamAssignment ?? '—'}</td>
                    <td className="px-6 py-4 font-semibold text-brand-teal">${Number(p.amount).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        p.method === 'CASH' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {p.method === 'CASH' ? 'Cash' : 'Bank Transfer'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-gray-400">{p.notes ?? '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <DeletePaymentButton id={p.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: 'teal' | 'navy' | 'orange' }) {
  const textColor = { teal: 'text-brand-teal', navy: 'text-brand-navy', orange: 'text-brand-orange' }[color]
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`font-condensed font-bold text-3xl mt-1 ${textColor}`}>{value}</p>
    </div>
  )
}
