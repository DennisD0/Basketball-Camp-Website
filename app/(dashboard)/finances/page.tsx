import prisma from '@/lib/prisma'
import FinanceDashboard from '@/components/finances/finance-dashboard'
import EmptyState from '@/components/ui/empty-state'

export default async function FinancesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payments: any[] = []
  let activeMembers = 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let expenses: any[] = []

  try {
    ;[payments, activeMembers, expenses] = await Promise.all([
      prisma.payment.findMany({
        include: { member: { select: { id: true, firstName: true, lastName: true, teamAssignment: true } } },
        orderBy: { date: 'desc' },
      }),
      prisma.member.count({ where: { status: 'ACTIVE' } }),
      prisma.expense.findMany({ select: { id: true, amount: true, description: true, category: true, date: true, paidBy: true }, orderBy: { date: 'desc' } }),
    ])
  } catch {
    return <EmptyState message="Could not reach the database. Add your DATABASE_URL in Vercel environment variables and redeploy." />
  }

  const revenue = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const netProfit = revenue - totalExpenses

  const now = new Date()
  const thisMonth = payments
    .filter(p => {
      const d = new Date(p.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const paidMemberIds = new Set(payments.map(p => p.memberId))
  const unpaidCount = Math.max(0, activeMembers - paidMemberIds.size)

  const dashPayments = payments.map(p => ({
    id: p.id,
    amount: Number(p.amount),
    method: p.method,
    date: p.date.toISOString(),
    memberId: p.memberId,
    memberName: `${p.member.firstName} ${p.member.lastName}`,
    teamAssignment: p.member.teamAssignment ?? null,
    notes: p.notes ?? null,
  }))

  const dashExpenses = expenses.map((e: { id: string; amount: unknown; description: string; category: string; date: Date; paidBy: string | null }) => ({
    id: e.id,
    amount: Number(e.amount),
    description: e.description,
    category: e.category,
    date: e.date.toISOString(),
    paidBy: e.paidBy ?? null,
  }))

  return (
    <FinanceDashboard
      payments={dashPayments}
      expenses={dashExpenses}
      revenue={revenue}
      totalExpenses={totalExpenses}
      netProfit={netProfit}
      thisMonth={thisMonth}
      unpaidCount={unpaidCount}
      paidCount={paidMemberIds.size}
    />
  )
}

