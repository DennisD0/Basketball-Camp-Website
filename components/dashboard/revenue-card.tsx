'use client'

import { BarChart, Bar, ResponsiveContainer, Tooltip } from 'recharts'

type WeekData = { week: string; amount: number }

export default function RevenueCard({
  thisMonth,
  lastMonth,
  total,
  weeklyData,
}: {
  thisMonth: number
  lastMonth: number
  total: number
  weeklyData: WeekData[]
}) {
  const trendPct = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null
  const isUp = trendPct === null || trendPct >= 0
  const hasData = weeklyData.some(d => d.amount > 0)

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-black/5 flex flex-col gap-5">
      <div>
        <h2 className="font-semibold text-gray-800">Revenue</h2>
        <p className="text-xs text-gray-400 mt-0.5">Fees collected</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">This Month</p>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">${thisMonth.toLocaleString()}</p>
          {trendPct !== null && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold mt-2 ${isUp ? 'text-brand-teal' : 'text-brand-orange'}`}>
              {isUp ? '▲' : '▼'} {Math.abs(trendPct).toFixed(1)}%
            </span>
          )}
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">All Season</p>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">${total.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-2">total</p>
        </div>
      </div>

      {hasData && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">This Month by Week</p>
          <ResponsiveContainer width="100%" height={64}>
            <BarChart data={weeklyData} barGap={2} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Bar dataKey="amount" fill="#2D3875" radius={[3, 3, 0, 0]} />
              <Tooltip
                formatter={(v: unknown) => [`$${Number(v).toLocaleString()}`, 'Revenue']}
                contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '11px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                cursor={{ fill: '#f9fafb' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
