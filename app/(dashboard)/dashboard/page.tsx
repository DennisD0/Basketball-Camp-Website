import prisma from '@/lib/prisma'
import StatCard from '@/components/dashboard/stat-card'
import AttendanceChart from '@/components/dashboard/attendance-chart'
import TeamDonut from '@/components/dashboard/team-donut'
import RecentMembers from '@/components/dashboard/recent-members'
import FlaggedMembers from '@/components/dashboard/flagged-members'
import RevenueCard from '@/components/dashboard/revenue-card'
import PaymentBreakdown from '@/components/dashboard/payment-breakdown'
import RegistrationStats from '@/components/dashboard/registration-stats'
import RevenueAreaChart from '@/components/dashboard/revenue-area-chart'
import AutoRefresh from '@/components/auto-refresh'
import Link from 'next/link'

const IconPeople = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L3 7v7c0 5.25 3.75 10.15 9 11.25C17.25 24.15 21 19.25 21 14V7L12 2z"/>
  </svg>
)
const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconDollar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)
const IconClipboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  </svg>
)

export default async function DashboardPage() {
  const now = new Date()
  const startOfMonth    = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth  = new Date(now.getFullYear(), now.getMonth(), 0)

  const [
    memberCount, teamCounts, allMembers, recentMembers,
    pendingRegistrations, payments, registrationCounts,
  ] = await Promise.all([
    prisma.member.count({ where: { status: 'ACTIVE' } }),
    prisma.member.groupBy({
      by: ['teamAssignment'],
      where: { status: 'ACTIVE', teamAssignment: { not: null } },
      _count: { id: true },
      orderBy: { teamAssignment: 'asc' },
    }),
    prisma.member.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, teamAssignment: true },
    }),
    prisma.member.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.registration.count({ where: { status: 'PENDING' } }),
    prisma.payment.findMany({ select: { amount: true, method: true, date: true, memberId: true } }),
    prisma.registration.groupBy({ by: ['status'], _count: { id: true } }),
  ])

  // Revenue
  const totalRevenue     = payments.reduce((s, p) => s + Number(p.amount), 0)
  const thisMonthRevenue = payments.filter(p => new Date(p.date) >= startOfMonth).reduce((s, p) => s + Number(p.amount), 0)
  const lastMonthRevenue = payments.filter(p => { const d = new Date(p.date); return d >= startOfLastMonth && d <= endOfLastMonth }).reduce((s, p) => s + Number(p.amount), 0)

  const weeklyAmounts = [0, 0, 0, 0]
  payments.forEach(p => {
    const d = new Date(p.date)
    if (d >= startOfMonth) weeklyAmounts[Math.min(Math.floor((d.getDate() - 1) / 7), 3)] += Number(p.amount)
  })
  const weeklyData = weeklyAmounts.map((amount, i) => ({ week: `Wk ${i + 1}`, amount }))

  // Payment methods
  const cashPayments = payments.filter(p => p.method === 'CASH')
  const bankPayments = payments.filter(p => p.method === 'BANK_TRANSFER')
  const cashAmount   = cashPayments.reduce((s, p) => s + Number(p.amount), 0)
  const bankAmount   = bankPayments.reduce((s, p) => s + Number(p.amount), 0)

  // Registrations
  const regByStatus = Object.fromEntries(registrationCounts.map(r => [r.status, r._count.id]))
  const regPending  = regByStatus['PENDING']  ?? 0
  const regApproved = regByStatus['APPROVED'] ?? 0
  const regRejected = regByStatus['REJECTED'] ?? 0

  // Outstanding fees
  const paidIds       = new Set(payments.map(p => p.memberId))
  const unpaidCount   = allMembers.filter(m => !paidIds.has(m.id)).length
  const outstanding   = unpaidCount * 50

  const teamData = teamCounts.map(t => ({ name: t.teamAssignment!, value: t._count.id }))

  return (
    <div className="space-y-6">
      <AutoRefresh />
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-navy">Dashboard</h1>
        <span className="text-sm text-gray-400 font-medium">
          {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Members"   value={memberCount}            color="teal"   icon={<IconPeople />}  trend={{ dir: 'up',   label: 'All teams' }} />
        <StatCard label="Teams"            value={teamData.length}        color="navy"   icon={<IconShield />} />
        <StatCard label="Avg Attendance"   value="87%"                    color="teal"   icon={<IconCheck />}   trend={{ dir: 'up',   label: '+4% this month' }} />
        <StatCard label="Outstanding Fees" value={`$${outstanding.toLocaleString()}`} color="orange" icon={<IconDollar />} trend={{ dir: 'down', label: `${unpaidCount} members` }} />
      </div>

      {/* Pending registrations banner */}
      {pendingRegistrations > 0 && (
        <Link
          href="/registrations"
          className="flex items-center gap-3 bg-brand-navy/5 border border-brand-navy/15 rounded-2xl px-5 py-4 hover:bg-brand-navy/10 transition-all group"
        >
          <div className="w-9 h-9 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy flex-shrink-0">
            <IconClipboard />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-brand-navy">
              {pendingRegistrations} pending registration{pendingRegistrations !== 1 ? 's' : ''} to review
            </p>
            <p className="text-xs text-gray-400">New parents submitted via the registration form</p>
          </div>
          <span className="text-xs text-brand-teal font-medium group-hover:underline">Review →</span>
        </Link>
      )}

      {/* Big revenue area chart */}
      <RevenueAreaChart
        payments={payments.map(p => ({ amount: Number(p.amount), date: new Date(p.date).toISOString() }))}
        thisMonthTotal={thisMonthRevenue}
        lastMonthTotal={lastMonthRevenue}
      />

      {/* Revenue card + Payment Breakdown + Registration Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RevenueCard thisMonth={thisMonthRevenue} lastMonth={lastMonthRevenue} total={totalRevenue} weeklyData={weeklyData} />
        <PaymentBreakdown cashAmount={cashAmount} bankAmount={bankAmount} cashCount={cashPayments.length} bankCount={bankPayments.length} />
        <RegistrationStats pending={regPending} approved={regApproved} rejected={regRejected} />
      </div>

      {/* Attendance + Team Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AttendanceChart members={allMembers} />
        </div>
        <TeamDonut data={teamData} />
      </div>

      {/* Flagged + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FlaggedMembers members={allMembers as any} />
        <div className="lg:col-span-2">
          <RecentMembers members={recentMembers} />
        </div>
      </div>
    </div>
  )
}
