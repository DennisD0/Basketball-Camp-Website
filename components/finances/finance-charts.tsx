'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

type Payment = { amount: number; method: string; date: string }

function buildMonthlyData(payments: Payment[]) {
  const months: Record<string, number> = {}
  payments.forEach(p => {
    const d = new Date(p.date)
    const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    months[key] = (months[key] ?? 0) + p.amount
  })
  // Keep last 6 months in chronological order
  return Object.entries(months)
    .slice(-6)
    .map(([month, amount]) => ({ month, amount }))
}

export default function FinanceCharts({ payments }: { payments: Payment[] }) {
  const monthlyData = buildMonthlyData(payments)

  const cashTotal = payments.filter(p => p.method === 'CASH').reduce((s, p) => s + p.amount, 0)
  const bankTotal = payments.filter(p => p.method === 'BANK_TRANSFER').reduce((s, p) => s + p.amount, 0)
  const methodData = [
    { name: 'Cash', value: cashTotal },
    { name: 'Bank Transfer', value: bankTotal },
  ].filter(d => d.value > 0)

  const COLORS = ['#2C6E6A', '#2D3875']

  if (payments.length === 0) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Monthly revenue bar chart */}
      <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="font-semibold text-gray-800 mb-0.5">Revenue Over Time</h2>
        <p className="text-xs text-gray-400 mb-5">Monthly totals</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData} barCategoryGap="35%" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip
              formatter={(v: unknown) => [`$${Number(v).toLocaleString()}`, 'Revenue']}
              contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: '12px' }}
              cursor={{ fill: '#f9fafb' }}
            />
            <Bar dataKey="amount" fill="#2D3875" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Payment method donut */}
      <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-black/5 flex flex-col">
        <h2 className="font-semibold text-gray-800 mb-0.5">By Method</h2>
        <p className="text-xs text-gray-400 mb-4">Cash vs Bank Transfer</p>
        <div className="flex-1 flex items-center justify-center">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={methodData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={68}
                dataKey="value"
                paddingAngle={3}
                strokeWidth={0}
              >
                {methodData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: unknown) => [`$${Number(v).toLocaleString()}`]}
                contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2.5 mt-2">
          {methodData.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-sm text-gray-600">{d.name}</span>
              </div>
              <span className="text-sm font-semibold text-gray-800">${d.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
