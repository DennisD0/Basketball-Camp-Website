import prisma from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import PrintButton from '@/components/registrations/print-button'
import { PROGRAM_LABELS, PROGRAM_PRICES } from '@/lib/programs'
import { getRegistrationConfig } from '@/lib/get-registration-config'
import { AGREEMENTS, AGREEMENT_ORDER, type AgreementKey } from '@/lib/agreements'

/**
 * Whether the parent accepted a given agreement.
 *
 * Session Window is not stored. The registration form requires it — submission
 * is blocked without it — but `competingAck` is never included in the POST body
 * and the Registration model has no column for it, so every stored registration
 * necessarily accepted it even though nothing recorded the fact. Printed as
 * accepted on that basis. If it ever stops being required, this must become a
 * real column instead.
 */
function accepted(
  key: AgreementKey,
  reg: { injuryWaiver: boolean; noRefundAck: boolean; mediaConsent: boolean },
): boolean {
  switch (key) {
    case 'injuryWaiver':  return reg.injuryWaiver
    case 'noRefundAck':   return reg.noRefundAck
    case 'mediaConsent':  return reg.mediaConsent
    case 'sessionWindow': return true
  }
}

/** Only for registrations taken before packages became staff-editable. Anything
 *  newer resolves out of the live registration config instead. */
const LEGACY_PACKAGE_LABELS: Record<string, { label: string; sessions: number; window: string }> = {
  '5-week': { label: '5-Week Package', sessions: 5, window: '7 weeks' },
  '7-week': { label: '7-Week Package', sessions: 7, window: '9 weeks' },
}

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  // This route deliberately sits outside the (dashboard) group so the contract
  // renders on its own — inside the group it inherited the sidebar, and the
  // preview iframe showed a working miniature of the whole app. That also means
  // it no longer inherits the layout's auth check, and the page carries a
  // parent's name, email and phone, so guard it here as well as in middleware.
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) redirect('/login')

  const { id } = await params
  const [reg, { config }] = await Promise.all([
    prisma.registration.findUnique({ where: { id } }),
    getRegistrationConfig(),
  ])
  if (!reg || reg.status !== 'APPROVED') notFound()

  const registeredOn = new Date(reg.createdAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  // Packages are staff-editable, so a modern registration's packageOption is a
  // config value like `package_1785855391156`, not one of the two legacy keys.
  // Resolve from the live config first — without this, a contract for any
  // custom package prints a raw database key, no session count and no price.
  const cfgPkg = config.packages.find(p => p.value === reg.packageOption)
  const legacyPkg = LEGACY_PACKAGE_LABELS[reg.packageOption]

  const pkgLabel: string = cfgPkg?.label ?? legacyPkg?.label ?? reg.packageOption
  const pkgSessions: string | number = cfgPkg?.sessions ?? legacyPkg?.sessions ?? '—'
  // The session window is the package's highlight ("Complete within 9 weeks").
  const pkgWindow: string = cfgPkg?.highlight ?? legacyPkg?.window ?? '—'
  const price = cfgPkg?.price ?? PROGRAM_PRICES[reg.programOption] ?? '—'

  const sportLabel = reg.sport ? reg.sport.charAt(0).toUpperCase() + reg.sport.slice(1) : ''
  const programLabel = PROGRAM_LABELS[reg.programOption]
    ?? (sportLabel ? `${sportLabel} — ${pkgLabel}` : pkgLabel)
  // Avoid printing the package name twice when it is already in the line above.
  const programDetail = programLabel.includes(pkgLabel) ? (cfgPkg?.description?.trim() ?? '') : pkgLabel

  const invoiceNum = `413-${reg.id.slice(-6).toUpperCase()}`

  return (
    <>
      <style>{`
        @media print {
          /* The on-screen toolbar is the only thing that must not print — the
             dashboard sidebar is no longer in this tree at all. */
          .no-print { display: none !important; }

          /* White page, no margin bleed */
          *, body, html { background: white !important; }
          body { margin: 0 !important; }

          /* Contract content fills the page */
          .contract-body { max-width: none !important; padding: 0 !important; }

          /* Full terms now print, so the contract can run past one page —
             never split a clause or the signature block across a page break. */
          .agreement-row, .signature-block { break-inside: avoid; page-break-inside: avoid; }

          /* Colour-accurate backgrounds (Bill To box, etc.) */
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;

          @page { margin: 0.65in; size: letter; }
        }
      `}</style>

      {/* Toolbar — hidden on print */}
      <div className="no-print flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <span className="text-sm text-gray-500">Contract for <strong className="text-gray-800">{reg.childName}</strong></span>
        <PrintButton />
      </div>

      {/* Invoice body */}
      <div className="contract-body max-w-2xl mx-auto px-8 py-10 font-sans text-gray-900">

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
                  {programDetail && <p className="text-xs text-gray-400 mt-0.5">{programDetail}</p>}
                </td>
                <td className="py-3 text-center text-gray-700">{pkgSessions}</td>
                <td className="py-3 text-center text-gray-400 text-xs">{pkgWindow}</td>
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
          <div className="text-sm">
            <div><span className="text-gray-500">Zelle</span> <span className="font-semibold ml-2">347-200-4439</span></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Include child&apos;s name in the memo. No spot is held until payment is received.</p>
        </div>

        {/* ── Agreements ──
             Exactly the four checkboxes the parent ticked on /register, in the
             same order and wording, both sides reading lib/agreements.ts. The
             contract must show what was signed and nothing else — it previously
             printed three hardcoded rows, then briefly the six editable
             contractSections, neither of which matched the form. */}
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Agreements</p>
          <div className="space-y-3">
            {AGREEMENT_ORDER.map(key => (
              <AgreementRow
                key={key}
                agreed={accepted(key, reg)}
                label={AGREEMENTS[key].title}
                detail={AGREEMENTS[key].body}
              />
            ))}
          </div>
        </div>

        {/* ── Signature block ── */}
        <div className="signature-block mt-10 pt-8 border-t-2 border-gray-900">
          <p className="text-xs text-gray-500 mb-6">
            By signing below, the parent/guardian confirms all information above is accurate and agrees to all terms stated in this registration agreement.
          </p>
          <div className="grid grid-cols-2 gap-10 mb-6">
            <div>
              <div className="border-b-2 border-gray-900 h-14 mb-1" />
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Parent / Guardian Signature</p>
            </div>
            <div>
              <div className="flex items-end border-b-2 border-gray-900 h-14 mb-1 pb-1">
                <span className="text-base font-medium text-gray-900">{reg.signedDate ?? ''}</span>
              </div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Date</p>
            </div>
          </div>
          <div>
            <div className="flex items-end border-b-2 border-gray-900 h-14 mb-1 pb-1">
              <span className="text-base font-medium text-gray-900">{reg.printedName ?? ''}</span>
            </div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Printed Name</p>
          </div>
        </div>

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
    <div className="flex gap-3 text-sm agreement-row">
      <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
        agreed ? 'bg-gray-900 text-white' : 'bg-red-100 text-red-600'
      }`}>
        {agreed ? '✓' : '✕'}
      </span>
      <div>
        <p className="font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5 whitespace-pre-line">{detail}</p>
      </div>
    </div>
  )
}
