'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#2D3875', '#2C6E6A', '#C85A1E']

type Props = {
  data: { name: string; value: number }[]
}

export default function TeamDonut({ data }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-black/5 h-full flex flex-col">
      <div className="mb-2">
        <h2 className="font-semibold text-gray-800">Team Breakdown</h2>
        <p className="text-xs text-gray-400 mt-0.5">{total} active players</p>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={78}
              dataKey="value"
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: '10px',
                border: 'none',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2.5 mt-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-sm text-gray-600">{d.name}</span>
            </div>
            <span className="text-sm font-semibold text-gray-800">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
