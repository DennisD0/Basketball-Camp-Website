export default function PaymentBreakdown({
  cashAmount,
  bankAmount,
  cashCount,
  bankCount,
}: {
  cashAmount: number
  bankAmount: number
  cashCount: number
  bankCount: number
}) {
  const total = cashAmount + bankAmount
  const cashPct = total > 0 ? Math.round((cashAmount / total) * 100) : 0
  const bankPct = 100 - cashPct

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-black/5">
      <h2 className="font-semibold text-gray-800 mb-0.5">Payment Methods</h2>
      <p className="text-xs text-gray-400 mb-6">How fees are being collected</p>

      <div className="space-y-5">
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-700">Cash</p>
            <p className="text-sm font-bold text-gray-900">{cashPct}%</p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-teal rounded-full"
              style={{ width: `${cashPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{cashCount} payment{cashCount !== 1 ? 's' : ''} · ${cashAmount.toLocaleString()}</p>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-700">Bank Transfer</p>
            <p className="text-sm font-bold text-gray-900">{bankPct}%</p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-navy rounded-full"
              style={{ width: `${bankPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{bankCount} payment{bankCount !== 1 ? 's' : ''} · ${bankAmount.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-gray-50 flex items-end justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Collected</p>
          <p className="text-2xl font-bold text-gray-900">${total.toLocaleString()}</p>
        </div>
        <p className="text-xs text-gray-400">{cashCount + bankCount} payments</p>
      </div>
    </div>
  )
}
