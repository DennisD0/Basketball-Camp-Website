import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PrintButton from '@/components/registrations/print-button'
import ContractSignature from '@/components/registrations/contract-signature'

const PROGRAM_LABELS: Record<string, string> = {
  basketball_early_bird:   'Basketball — Early Bird',
  basketball_memorial_day: 'Basketball — Best Deal',
  basketball_regular:      'Basketball — Standard',
  volleyball_early_bird:   'Volleyball — Early Bird',
  volleyball_memorial_day: 'Volleyball — Best Deal',
  volleyball_regular:      'Volleyball — Standard',
}

const PACKAGE_LABELS: Record<string, { label: string; sessions: number; window: string }> = {
  '5-week': { label: '5-Week Package', sessions: 5, window: '7 weeks' },
  '7-week': { label: '7-Week Package', sessions: 7, window: '9 weeks' },
}

const PRICING: Record<string, string> = {
  basketball_early_bird:   '$350',
  basketball_memorial_day: '$300',
  basketball_regular:      '$400',
  volleyball_early_bird:   '$350',
  volleyball_memorial_day: '$300',
  volleyball_regular:      '$400',
}

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const reg = await prisma.registration.findUnique({ where: { id } })
  if (!reg || reg.status !== 'APPROVED') notFound()

  const registeredOn = new Date(reg.createdAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  const pkg = PACKAGE_LABELS[reg.packageOption] ?? { label: reg.packageOption, sessions: '—', window: '—' }
  const programLabel = PROGRAM_LABELS[reg.programOption] ?? reg.programOption
  const price = PRICING[reg.programOption] ?? '—'
  const invoiceNum = `413-${reg.id.slice(-6).toUpperCase()}`

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 0.75in; }
        }
        .print-input { border: none !important; background: transparent !important; }
        .print-input::placeholder { color: transparent !important; }
      `}</style>

      {/* Toolbar — hidden on print */}
      <div className="no-print flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <span className="text-sm text-gray-500">Contract for <strong className="text-gray-800">{reg.childName}</strong></span>
        <PrintButton />
      </div>

      {/* Invoice body */}
      <div className="max-w-2xl mx-auto px-8 py-10 font-sans text-gray-900">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900">413 Youth Club</h1>
            <p className="text-sm text-gray-400 mt-1">Oakland Gardens, NY · 58-06 Springfield Blvd</p>
          </div>
          <div className="text-right">
            <span className="inline-block bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full tracking-widest uppercase mb-2">
              Registration Agreement
            </span>
            <p className="text-xs text-gray-400">Invoice # <span className="font-mono font-semibold text-gray-700">{invoiceNum}</span></p>
            <p className="text-xs text-gray-400 mt-0.5">Date: <span className="font-semibold text-gray-700">{registeredOn}</span></p>
          </div>
        </div>

        {/* ── Bill To ── */}
        <div className="bg-gray-50 rounded-xl p-5 mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Bill To</p>
          <p className="font-bold text-gray-900 text-base">{reg.parentName}</p>
          <p className="text-sm text-gray-500 mt-0.5">{reg.parentEmail ?? '—'}</p>
          <p className="text-sm text-gray-500">{reg.parentPhone}</p>
        </div>

        {/* ── Athlete ── */}
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Athlete</p>
          <div className="grid grid-cols-2 gap-3">
            <InvoiceField label="Full Name" value={reg.childName} />
            <InvoiceField label="Age Group" value={reg.ageGroup} />
            <InvoiceField label="Sport" value={reg.sport} />
          </div>
        </div>

        {/* ── Line Items ── */}
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Program Details</p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-900">
                <th className="text-left py-2 font-bold text-gray-700 text-xs uppercase tracking-wide">Description</th>
                <th className="text-center py-2 font-bold text-gray-700 text-xs uppercase tracking-wide">Sessions</th>
                <th className="text-center py-2 font-bold text-gray-700 text-xs uppercase tracking-wide">Window</th>
                <th className="text-right py-2 font-bold text-gray-700 text-xs uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3">
                  <p className="font-semibold text-gray-900">{programLabel}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{pkg.label}</p>
                </td>
                <td className="py-3 text-center text-gray-700">{pkg.sessions}</td>
                <td className="py-3 text-center text-gray-400 text-xs">{pkg.window}</td>
                <td className="py-3 text-right font-bold text-gray-900">{price}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-4 text-right text-sm font-bold text-gray-500 uppercase tracking-wide pr-4">Total Due</td>
                <td className="pt-4 text-right text-xl font-black text-gray-900">{price}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── Payment Instructions ── */}
        <div className="bg-gray-50 rounded-xl p-5 mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Payment Instructions</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">Zelle</span> <span className="font-semibold ml-2">347-200-4439</span></div>
            <div><span className="text-gray-500">Venmo</span> <span className="font-semibold ml-2">@benro97</span></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Include child&apos;s name in the memo. No spot is held until payment is received.</p>
        </div>

        {/* ── Agreements ── */}
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Agreements</p>
          <div className="space-y-3">
            <AgreementRow agreed={reg.injuryWaiver} label="Injury Liability Waiver"
              detail="Parent understands this is a physical activity and releases the coaches and 413 Youth Club from liability for injuries." />
            <AgreementRow agreed={reg.noRefundAck} label="No Refund Policy"
              detail="All payments are final and non-refundable." />
            <AgreementRow agreed={reg.mediaConsent} label="Media Consent"
              detail="Parent gives permission for the child to appear in photos/videos for promotional and social media use." />
          </div>
        </div>

        {/* ── Signature block (client component with fillable fields) ── */}
        <ContractSignature />

        <p className="text-center text-[10px] text-gray-300 mt-12 tracking-wide">
          413 YOUTH CLUB · OAKLAND GARDENS, NY · 58-06 SPRINGFIELD BLVD
        </p>
      </div>
    </>
  )
}

function InvoiceField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  )
}

function AgreementRow({ agreed, label, detail }: { agreed: boolean; label: string; detail: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
        agreed ? 'bg-gray-900 text-white' : 'bg-red-100 text-red-600'
      }`}>
        {agreed ? '✓' : '✕'}
      </span>
      <div>
        <p className="font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{detail}</p>
      </div>
    </div>
  )
}
