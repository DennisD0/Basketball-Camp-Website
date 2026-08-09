'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'
import DeletePaymentButton from './delete-payment-button'
import { asLocalDate } from '@/lib/dates'

type Payment = {
  id: string; amount: number; method: string; date: string
  memberId: string; memberName: string; teamAssignment: string | null; notes: string | null
}
type Expense = {
  id: string; amount: number; description: string; category: string; date: string; paidBy: string | null
}
type Props = {
  payments: Payment[]; expenses: Expense[]
  revenue: number
  unpaidCount: number; paidCount: number
}

const PERIOD_WEEKS: Record<string, number> = { '4W': 4, '8W': 8, '3M': 12, '6M': 26, '1Y': 52 }

const REVENUE_PERIODS = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: '3months', label: 'Past 3 Months' },
] as const
type RevenuePeriod = typeof REVENUE_PERIODS[number]['key']

// Net Profit offers the same three windows plus All, because this card is the
// page's headline number and "what have we made, ever" has to stay reachable.
const PROFIT_PERIODS = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: '3months', label: '3 Mo' },
  { key: 'all', label: 'All' },
] as const
type ProfitPeriod = typeof PROFIT_PERIODS[number]['key']

/** Start of a rolling window, or null for "no cutoff — count everything". */
function periodCutoff(period: RevenuePeriod | ProfitPeriod): Date | null {
  if (period === 'all') return null
  const now = new Date()
  const cutoff = new Date()
  if (period === 'week') cutoff.setDate(now.getDate() - 7)
  else if (period === 'month') cutoff.setMonth(now.getMonth() - 1)
  else cutoff.setMonth(now.getMonth() - 3)
  return cutoff
}

/**
 * Total the rows dated on or after `cutoff`. Payments and expenses are summed
 * by the identical rule on purpose — a net profit whose two halves were
 * windowed differently would be a number that describes nothing.
 */
function sumInPeriod(rows: { amount: number; date: string }[], cutoff: Date | null) {
  const inWindow = cutoff ? rows.filter(r => asLocalDate(r.date) >= cutoff) : rows
  return inWindow.reduce((s, r) => s + r.amount, 0)
}
const METHOD_COLORS = ['#2C6E6A', '#2D3875']
const CAT_COLORS: Record<string, string> = {
  'Gym / Facility': '#2D3875',
  'Equipment': '#2C6E6A',
  'Uniforms': '#f59e0b',
  'Marketing': '#8b5cf6',
  'Miscellaneous': '#6b7280',
}

function mondayOf(d: Date): Date {
  const r = new Date(d)
  const day = r.getDay()
  r.setDate(r.getDate() - day + (day === 0 ? -6 : 1))
  r.setHours(0, 0, 0, 0)
  return r
}

function weekLabel(d: Date): string {
  return mondayOf(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function buildWeeklyProfitData(payments: Payment[], expenses: Expense[], weeksBack: number) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - weeksBack * 7)

  const revByWeek: Record<string, number> = {}
  const expByWeek: Record<string, number> = {}
  const weekStart: Record<string, number> = {}  // label → Monday timestamp for sorting

  const touch = (d: Date, label: string) => {
    if (!(label in weekStart)) weekStart[label] = mondayOf(d).getTime()
  }

  payments.filter(p => asLocalDate(p.date) >= cutoff).forEach(p => {
    const d = asLocalDate(p.date)
    const label = weekLabel(d)
    revByWeek[label] = (revByWeek[label] ?? 0) + p.amount
    touch(d, label)
  })
  expenses.filter(e => asLocalDate(e.date) >= cutoff).forEach(e => {
    const d = asLocalDate(e.date)
    const label = weekLabel(d)
    expByWeek[label] = (expByWeek[label] ?? 0) + e.amount
    touch(d, label)
  })

  return Object.keys(weekStart)
    .sort((a, b) => weekStart[a] - weekStart[b])
    .map(week => ({
      week,
      revenue: revByWeek[week] ?? 0,
      expenses: expByWeek[week] ?? 0,
      profit: (revByWeek[week] ?? 0) - (expByWeek[week] ?? 0),
    }))
}

function buildSparkline(payments: Payment[]) {
  const months: Record<string, number> = {}
  payments.forEach(p => {
    const key = asLocalDate(p.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    months[key] = (months[key] ?? 0) + p.amount
  })
  return Object.entries(months).slice(-8).map(([label, amount]) => ({ label, amount }))
}

function MiniSparkline({ data }: { data: { label: string; amount: number }[] }) {
  if (data.length < 2) return null
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <Line type="monotone" dataKey="amount" stroke="#2C6E6A" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

// Quick-pick categories + free-typed "Other"
const EXPENSE_CATS = [
  { value: 'Gym / Facility', label: 'Gym Payment' },
  { value: 'Equipment', label: 'Equipment' },
  { value: 'Miscellaneous', label: 'Misc' },
]

export default function FinanceDashboard({
  payments, expenses, revenue, unpaidCount, paidCount,
}: Props) {
  const [profitPeriod, setProfitPeriod] = useState('8W')      // weekly chart below
  const [profitScope, setProfitScope] = useState<ProfitPeriod>('all')  // Net Profit card
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>('month')
  const [txSearch, setTxSearch] = useState('')
  const [expSearch, setExpSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'payments' | 'expenses'>('payments')

  // Expense form state. The same form does add and edit — `editingExpId` is the
  // only difference, and null means add.
  const [showExpForm, setShowExpForm] = useState(false)
  const [editingExpId, setEditingExpId] = useState<string | null>(null)
  const [expForm, setExpForm] = useState({ description: '', category: EXPENSE_CATS[0].value, amount: '', date: '' })
  const [customCategory, setCustomCategory] = useState(false)
  const [expSaving, setExpSaving] = useState(false)
  const [expError, setExpError] = useState('')
  const [localExpenses, setLocalExpenses] = useState(expenses)

  const sparkline    = useMemo(() => buildSparkline(payments), [payments])
  const weeklyData   = useMemo(() => buildWeeklyProfitData(payments, localExpenses, PERIOD_WEEKS[profitPeriod]), [payments, localExpenses, profitPeriod])
  const periodRevenue = useMemo(() => sumInPeriod(payments, periodCutoff(revenuePeriod)), [payments, revenuePeriod])
  const methodData   = useMemo(() => [
    { name: 'Cash',          value: payments.filter(p => p.method === 'CASH').reduce((s, p) => s + p.amount, 0) },
    { name: 'Bank Transfer', value: payments.filter(p => p.method === 'BANK_TRANSFER').reduce((s, p) => s + p.amount, 0) },
  ].filter(d => d.value > 0), [payments])

  const filteredPayments = txSearch.trim()
    ? payments.filter(p => p.memberName.toLowerCase().includes(txSearch.toLowerCase()) || (p.notes ?? '').toLowerCase().includes(txSearch.toLowerCase()))
    : payments

  const filteredExpenses = expSearch.trim()
    ? localExpenses.filter(e => e.description.toLowerCase().includes(expSearch.toLowerCase()) || e.category.toLowerCase().includes(expSearch.toLowerCase()))
    : localExpenses

  // All-time expenses, for the mini stat card only.
  const localExpTotal = localExpenses.reduce((s, e) => s + e.amount, 0)

  // Net profit is DERIVED from the same `localExpenses` every other expense
  // figure on this page reads, never passed in from the server. The server's
  // copy was computed once at render and could not see an expense added since —
  // adding one used to leave this number frozen while the "Revenue − Expenses"
  // caption directly beneath it updated, so the card contradicted itself.
  //
  // The caption reads these same two scoped values, so it always shows the
  // subtraction actually being displayed above it, in whichever window is on.
  const profitCutoff = useMemo(() => periodCutoff(profitScope), [profitScope])
  const scopedRevenue = useMemo(() => sumInPeriod(payments, profitCutoff), [payments, profitCutoff])
  const scopedExpenses = useMemo(() => sumInPeriod(localExpenses, profitCutoff), [localExpenses, profitCutoff])
  const netProfit = scopedRevenue - scopedExpenses
  const profitPositive = netProfit >= 0

  function resetExpForm() {
    setExpForm({ description: '', category: EXPENSE_CATS[0].value, amount: '', date: '' })
    setCustomCategory(false)
    setEditingExpId(null)
    setExpError('')
    setShowExpForm(false)
  }

  function startEditExpense(e: Expense) {
    setEditingExpId(e.id)
    setExpForm({
      description: e.description,
      category: e.category,
      amount: String(e.amount),
      // asLocalDate pins to noon UTC, so the date part round-trips to exactly
      // what the API stored — no off-by-one from the browser's timezone.
      date: asLocalDate(e.date).toISOString().slice(0, 10),
    })
    setCustomCategory(!EXPENSE_CATS.some(c => c.value === e.category))
    setExpError('')
    setShowExpForm(true)
  }

  async function handleSubmitExpense(ev: React.FormEvent) {
    ev.preventDefault()
    setExpSaving(true)
    setExpError('')
    const editing = editingExpId !== null
    const res = await fetch('/api/expenses', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing ? { ...expForm, id: editingExpId } : expForm),
    })
    setExpSaving(false)
    if (res.ok) {
      const saved = await res.json()
      const row = { ...saved, amount: Number(saved.amount) }
      setLocalExpenses(prev => (editing ? prev.map(e => (e.id === row.id ? row : e)) : [row, ...prev]))
      resetExpForm()
    } else {
      const d = await res.json().catch(() => ({}))
      setExpError(d.error || 'Failed to save')
    }
  }

  async function handleDeleteExpense(id: string) {
    if (!confirm('Delete this expense?')) return
    await fetch('/api/expenses', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setLocalExpenses(prev => prev.filter(e => e.id !== id))
    // Deleting the row currently open in the form would otherwise leave the
    // form editing a record that no longer exists.
    if (editingExpId === id) resetExpForm()
  }

  const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/40 bg-white'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-condensed font-bold text-2xl text-brand-navy tracking-wide">Finances</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab('expenses'); setShowExpForm(true) }}
            className="min-h-[44px] flex items-center bg-brand-navy text-white px-4 rounded-full text-sm font-semibold hover:bg-brand-navy/90 transition-all active:scale-95"
          >
            + Expense
          </button>
          <Link
            href="/finances/new"
            className="min-h-[44px] flex items-center bg-brand-teal text-white px-4 rounded-full text-sm font-semibold hover:bg-brand-teal/90 transition-all active:scale-95"
          >
            + Payment
          </Link>
        </div>
      </div>

      {/* Primary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Net Profit */}
        <div className="sm:col-span-2 bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Net Profit</p>
            <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
              {PROFIT_PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setProfitScope(p.key)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${
                    profitScope === p.key ? 'bg-white text-brand-navy shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end justify-between gap-4 mt-2">
            <div>
              <p className={`font-condensed font-bold text-4xl leading-none ${profitPositive ? 'text-brand-navy' : 'text-red-500'}`}>
                {profitPositive ? '' : '−'}${Math.abs(netProfit).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Revenue <span className="font-semibold text-brand-teal">${scopedRevenue.toLocaleString()}</span>
                {' '}− Expenses <span className="font-semibold text-brand-navy">${scopedExpenses.toLocaleString()}</span>
              </p>
            </div>
            <div className="w-28 h-14 flex-shrink-0">
              <MiniSparkline data={sparkline} />
            </div>
          </div>
        </div>

        {/* Revenue (period-selectable) + members */}
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Revenue</p>
              <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                {REVENUE_PERIODS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setRevenuePeriod(p.key)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${
                      revenuePeriod === p.key ? 'bg-white text-brand-navy shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="font-condensed font-bold text-3xl text-brand-navy leading-none mt-2">${periodRevenue.toLocaleString()}</p>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-400 font-medium">Unpaid members</p>
              <p className="font-condensed font-bold text-xl text-amber-500 leading-tight">{unpaidCount}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-medium">Paid members</p>
              <p className="font-condensed font-bold text-xl text-emerald-600 leading-tight">{paidCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary mini stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Revenue', value: `$${revenue.toLocaleString()}`, sub: 'all-time payments in' },
          { label: 'Total Expenses', value: `$${localExpTotal.toLocaleString()}`, sub: 'all-time costs out' },
          { label: 'Total Transactions', value: String(payments.length), sub: 'payment records' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{c.label}</p>
            <p className="font-condensed font-bold text-2xl text-brand-navy mt-1 leading-none">{c.value}</p>
            <p className="text-[10px] text-gray-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Weekly Profit / Revenue / Expenses chart */}
      <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-gray-800">Weekly Profit Breakdown</h2>
            <p className="text-xs text-gray-400 mt-0.5">Revenue vs Expenses per week</p>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {Object.keys(PERIOD_WEEKS).map(p => (
              <button
                key={p}
                onClick={() => setProfitPeriod(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  profitPeriod === p ? 'bg-white text-brand-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        {weeklyData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No data for this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -16, bottom: 0 }} barGap={2}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2C6E6A" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#2C6E6A" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((v: unknown, name: unknown) => [`$${Number(v).toLocaleString()}`, typeof name === 'string' ? name.charAt(0).toUpperCase() + name.slice(1) : '']) as never}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }}
                cursor={{ fill: '#f9fafb' }}
              />
              <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
              <Bar dataKey="revenue" fill="#2C6E6A" radius={[3, 3, 0, 0]} name="revenue" />
              <Bar dataKey="expenses" fill="#2D3875" radius={[3, 3, 0, 0]} name="expenses" />
              <Bar dataKey="profit" fill="#f59e0b" radius={[3, 3, 0, 0]} name="profit" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabbed: Payments | Expenses */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100">
          {(['payments', 'expenses'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? 'text-brand-navy border-b-2 border-brand-navy'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab === 'payments' ? `Payments (${payments.length})` : `Expenses (${localExpenses.length})`}
            </button>
          ))}
        </div>

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <>
            <div className="px-5 pt-4 pb-3 border-b border-gray-50">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><SearchIcon /></span>
                <input
                  type="text" placeholder="Search by member or notes…" value={txSearch}
                  onChange={e => setTxSearch(e.target.value)}
                  className="w-full min-h-[40px] pl-9 pr-4 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/40 transition-all"
                />
              </div>
            </div>
            {payments.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-gray-400 mb-2">No payments recorded yet.</p>
                <Link href="/finances/new" className="text-brand-teal text-sm font-semibold hover:underline">Record the first one →</Link>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="px-6 py-10 text-center"><p className="text-sm text-gray-400">No matches.</p></div>
            ) : (
              <>
                {/* Mobile */}
                <div className="md:hidden divide-y divide-gray-50">
                  {filteredPayments.map(p => (
                    <div key={p.id} className="px-4 py-3.5 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <Link href={`/members/${p.memberId}`} className="font-semibold text-sm text-brand-navy hover:text-brand-teal transition-colors truncate block">{p.memberName}</Link>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {p.teamAssignment && <span className="text-[10px] font-bold text-brand-navy/60 uppercase tracking-wide">{p.teamAssignment}</span>}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.method === 'CASH' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                            {p.method === 'CASH' ? 'Cash' : 'Transfer'}
                          </span>
                          <span className="text-[10px] text-gray-400">{asLocalDate(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                        </div>
                        {p.notes && <p className="text-[11px] text-gray-400 mt-1 truncate">{p.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-condensed font-bold text-base text-brand-teal">${p.amount.toFixed(2)}</span>
                        <DeletePaymentButton id={p.id} />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Member', 'Amount', 'Method', 'Date', 'Notes', ''].map(h => (
                          <th key={h} className="px-5 py-3 text-left font-semibold text-gray-400 text-xs uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredPayments.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-5 py-3.5">
                            <Link href={`/members/${p.memberId}`} className="font-medium text-gray-900 hover:text-brand-teal transition-colors">{p.memberName}</Link>
                            {p.teamAssignment && <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">{p.teamAssignment}</span>}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-brand-teal">${p.amount.toFixed(2)}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${p.method === 'CASH' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                              {p.method === 'CASH' ? 'Cash' : 'Bank Transfer'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 text-xs">{asLocalDate(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                          <td className="px-5 py-3.5 text-gray-400 text-xs max-w-[160px] truncate">{p.notes ?? '—'}</td>
                          <td className="px-5 py-3.5 text-right"><DeletePaymentButton id={p.id} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* EXPENSES TAB */}
        {activeTab === 'expenses' && (
          <>
            {/* Add / edit expense form */}
            {showExpForm && (
              <div className="px-5 pt-4 pb-4 border-b border-gray-100">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">
                  {editingExpId ? 'Edit expense' : 'New expense'}
                </p>
                <form onSubmit={handleSubmitExpense} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Description *</label>
                      <input required type="text" placeholder="e.g. March gym rental" value={expForm.description}
                        onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Category *</label>
                      <div className="flex flex-wrap gap-2">
                        {EXPENSE_CATS.map(c => {
                          const selected = !customCategory && expForm.category === c.value
                          return (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => { setCustomCategory(false); setExpForm(f => ({ ...f, category: c.value })) }}
                              className={`min-h-[44px] px-4 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                                selected
                                  ? 'bg-brand-navy text-white shadow-sm'
                                  : 'bg-gray-50 text-gray-500 ring-1 ring-black/10 hover:bg-gray-100'
                              }`}
                            >
                              {c.label}
                            </button>
                          )
                        })}
                        <button
                          type="button"
                          onClick={() => { setCustomCategory(true); setExpForm(f => ({ ...f, category: '' })) }}
                          className={`min-h-[44px] px-4 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                            customCategory
                              ? 'bg-brand-navy text-white shadow-sm'
                              : 'bg-gray-50 text-gray-500 ring-1 ring-black/10 hover:bg-gray-100'
                          }`}
                        >
                          Other…
                        </button>
                      </div>
                      {customCategory && (
                        <input
                          required type="text" placeholder="Type a category, e.g. Travel"
                          value={expForm.category}
                          onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}
                          className={`${inputCls} mt-2`}
                          autoFocus
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Amount ($) *</label>
                      <input required type="number" min="0" step="0.01" placeholder="0.00" value={expForm.amount}
                        onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Date *</label>
                      <input required type="date" value={expForm.date} onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
                    </div>
                  </div>
                  {expError && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{expError}</p>}
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={resetExpForm}
                      className="flex-1 min-h-[40px] rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                    <button type="submit" disabled={expSaving}
                      className="flex-1 min-h-[40px] rounded-xl bg-brand-teal text-white text-sm font-semibold hover:bg-brand-teal/90 disabled:opacity-50 transition-all">
                      {expSaving ? 'Saving…' : editingExpId ? 'Save Changes' : 'Save Expense'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="px-5 pt-4 pb-3 border-b border-gray-50 flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><SearchIcon /></span>
                <input type="text" placeholder="Search expenses…" value={expSearch} onChange={e => setExpSearch(e.target.value)}
                  className="w-full min-h-[40px] pl-9 pr-4 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/40 transition-all" />
              </div>
              {!showExpForm && (
                <button onClick={() => { setEditingExpId(null); setShowExpForm(true) }}
                  className="min-h-[40px] px-4 rounded-xl bg-brand-navy text-white text-xs font-bold uppercase tracking-wide hover:bg-brand-navy/90 transition-all flex-shrink-0">
                  + Add
                </button>
              )}
            </div>

            {localExpenses.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-gray-400 mb-2">No expenses recorded yet.</p>
                <button onClick={() => setShowExpForm(true)} className="text-brand-teal text-sm font-semibold hover:underline">Add the first one →</button>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="px-6 py-10 text-center"><p className="text-sm text-gray-400">No matches.</p></div>
            ) : (
              <>
                {/* Mobile */}
                <div className="md:hidden divide-y divide-gray-50">
                  {filteredExpenses.map(e => (
                    <div key={e.id} className="px-4 py-3.5 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{e.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase tracking-wide">{e.category}</span>
                          <span className="text-[10px] text-gray-400">{asLocalDate(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-condensed font-bold text-base text-brand-orange">${e.amount.toFixed(2)}</span>
                        <button onClick={() => startEditExpense(e)} aria-label={`Edit ${e.description}`} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-300 hover:text-brand-teal hover:bg-brand-teal/10 rounded-xl transition-colors">
                          <PencilIcon />
                        </button>
                        <button onClick={() => handleDeleteExpense(e.id)} aria-label={`Delete ${e.description}`} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Description', 'Category', 'Amount', 'Date', ''].map(h => (
                          <th key={h} className="px-5 py-3 text-left font-semibold text-gray-400 text-xs uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredExpenses.map(e => (
                        <tr key={e.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-gray-900">{e.description}</td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: CAT_COLORS[e.category] ?? '#6b7280' }} />
                              {e.category}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-brand-orange">${e.amount.toFixed(2)}</td>
                          <td className="px-5 py-3.5 text-gray-500 text-xs">{asLocalDate(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <button onClick={() => startEditExpense(e)} className="text-xs text-gray-400 hover:text-brand-teal font-medium transition-colors mr-3">Edit</button>
                            <button onClick={() => handleDeleteExpense(e.id)} className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* By Method donut — only shown with payment data */}
      {methodData.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="font-semibold text-gray-800 mb-0.5">Revenue by Method</h2>
          <p className="text-xs text-gray-400 mb-4">Cash vs Bank Transfer</p>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-48 h-40 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={methodData} cx="50%" cy="50%" innerRadius={45} outerRadius={68} dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {methodData.map((_, i) => <Cell key={i} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => [`$${Number(v).toLocaleString()}`]} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3 w-full">
              {methodData.map((d, i) => {
                const pct = Math.round((d.value / revenue) * 100)
                return (
                  <div key={d.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: METHOD_COLORS[i % METHOD_COLORS.length] }} />
                        <span className="text-sm text-gray-600">{d.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">${d.value.toLocaleString()} <span className="text-gray-400 font-normal text-xs">({pct}%)</span></span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: METHOD_COLORS[i % METHOD_COLORS.length] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
