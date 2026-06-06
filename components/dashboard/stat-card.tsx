type Trend = { dir: 'up' | 'down'; label: string }

type Props = {
  label: string
  value: string | number
  color: 'navy' | 'teal' | 'orange' | 'gray'
  trend?: Trend
  icon: React.ReactNode
}

const palette = {
  navy:   { ring: 'bg-[#2D3875]/10', text: 'text-[#2D3875]' },
  teal:   { ring: 'bg-[#2C6E6A]/10', text: 'text-[#2C6E6A]' },
  orange: { ring: 'bg-[#C85A1E]/10', text: 'text-[#C85A1E]' },
  gray:   { ring: 'bg-gray-100',     text: 'text-gray-500'   },
}

export default function StatCard({ label, value, color, trend, icon }: Props) {
  const p = palette[color]
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-black/5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
      <div className={`w-10 h-10 ${p.ring} rounded-2xl flex items-center justify-center mb-4 ${p.text}`}>
        {icon}
      </div>
      <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {trend && (
        <p className={`text-xs mt-2.5 font-medium ${trend.dir === 'up' ? 'text-[#2C6E6A]' : 'text-[#C85A1E]'}`}>
          {trend.dir === 'up' ? '▲' : '▼'} {trend.label}
        </p>
      )}
    </div>
  )
}
