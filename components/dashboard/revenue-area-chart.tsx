'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

type Payment = { amount: number; date: string }

function buildDailyData(payments: Payment[]) {
  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  // Build day-by-day map for both months (up to 31 days)
  const days = Math.max(
    lastMonthEnd.getDate(),
    now.getDate(),
  )

  const thisMonthTotals: Record<number, number> = {}
  const lastMonthTotals: Record<number, number> = {}

  payments.forEach(p => {
    const d = new Date(p.date)
    const m = d.getMonth()
    const y = d.getFullYear()
    const day = d.getDate()

    if (m === now.getMonth() && y === now.getFullYear()) {
      thisMonthTotals[day] = (thisMonthTotals[day] ?? 0) + p.amount
    } else if (m === lastMonth.getMonth() && y === lastMonth.getFullYear()) {
      lastMonthTotals[day] = (lastMonthTotals[day] ?? 0) + p.amount
    }
  })

  // Convert to cumulative running totals
  let thisRunning = 0
  let lastRunning = 0

  return Array.from({ length: days }, (_, i) => {
    const day = i + 1
    thisRunning += thisMonthTotals[day] ?? 0
    lastRunning += lastMonthTotals[day] ?? 0
    return {
      day: `${day}`,
      'This Month': thisRunning,
      'Last Month': lastRunning,
    }
  })
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-lg ring-1 ring-black/5 px-4 py-3 text-xs">
      <p className="text-gray-400 mb-2">Day {label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-semibold text-gray-900">${p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default function RevenueAreaChart({
  payments,
  thisMonthTotal,
  lastMonthTotal,
}: {
  payments: Payment[]
  thisMonthTotal: number
  lastMonthTotal: number
}) {
  const data = buildDailyData(payments)
  const trendPct = lastMonthTotal > 0
    ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1)
    : null
  const isUp = trendPct === null || Number(trendPct) >= 0

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-black/5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="font-semibold text-gray-800 text-base">Revenue Overview</h2>
          <p className="text-xs text-gray-400 mt-0.5">Cumulative fees collected — day by day</p>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">This Month</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-gray-900 tracking-tight">${thisMonthTotal.toLocaleString()}</p>
              {trendPct !== null && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isUp ? 'bg-brand-teal/10 text-brand-teal' : 'bg-brand-orange/10 text-brand-orange'}`}>
                  {isUp ? '▲' : '▼'} {Math.abs(Number(trendPct))}%
                </span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Last Month</p>
            <p className="text-2xl font-bold text-gray-400 tracking-tight">${lastMonthTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="thisMonthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#2D3875" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#2D3875" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="lastMonthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#2C6E6A" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#2C6E6A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            interval={4}
            tickFormatter={v => `${v}`}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `$${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
            iconType="circle"
            iconSize={8}
          />
          <Area
            type="monotone"
            dataKey="Last Month"
            stroke="#2C6E6A"
            strokeWidth={2}
            strokeDasharray="5 3"
            fill="url(#lastMonthGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#2C6E6A' }}
          />
          <Area
            type="monotone"
            dataKey="This Month"
            stroke="#2D3875"
            strokeWidth={2.5}
            fill="url(#thisMonthGrad)"
            dot={false}
            activeDot={{ r: 5, fill: '#2D3875' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
