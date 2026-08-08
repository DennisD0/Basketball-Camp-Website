import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PrintButton from '@/components/registrations/print-button'
import { PROGRAM_LABELS, PROGRAM_PRICES } from '@/lib/programs'
import { getRegistrationConfig } from '@/lib/get-registration-config'

/**
 * Which registration checkbox, if any, a contract section records the answer to.
 *
 * Matched on keywords rather than exact titles because staff can rename sections
 * in the registration editor. A section that maps to nothing — Program
 * Commitment, Drop-in Policy, the sibling discount — is printed as a plain term,
 * which is right: those are terms of the agreement, not per-parent consents.
 */
function consentFor(
  title: string,
  reg: { injuryWaiver: boolean; noRefundAck: boolean; mediaConsent: boolean },
): boolean | null {
  const t = title.toLowerCase()
  if (t.includes('injury') || t.includes('liability') || t.includes('waiver')) return reg.injuryWaiver
  if (t.includes('refund')) return reg.noRefundAck
  if (t.includes('media') || t.includes('photo')) return reg.mediaConsent
  return null
}

/** Only for registrations taken before packages became staff-editable. Anything
 *  newer resolves out of the live registration config instead. */
const LEGACY_PACKAGE_LABELS: Record<string, { label: string; sessions: number; window: string }> = {
  '5-week': { label: '5-Week Package', sessions: 5, window: '7 weeks' },
  '7-week': { label: '7-Week Package', sessions: 7, window: '9 weeks' },
}

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
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
          /* Hide all dashboard chrome */
          nav, .no-print { display: none !important; }

          /* White page, no margin bleed */
          *, body, html { background: white !important; }
          body { margin: 0 !important; }

          /* Strip the dashboard layout wrapper constraints */
          .min-h-screen { background: white !important; min-height: unset !important; }
          main { max-width: none !important; padding: 0 !important; margin: 0 !important; }

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
             Driven by the same contractSections the /register page shows and the
             registration editor edits. These used to be three hardcoded rows,
             which silently dropped every other term — including the session
             window in Program Commitment — and meant edits in the editor never
             reached the printed contract. */}
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Agreements</p>
          <div className="space-y-3">
            {config.contractSections.map(section => (
              <AgreementRow
                key={section.title}
                agreed={consentFor(section.title, reg)}
                label={section.title}
                detail={section.body}
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

/** `agreed === null` means the section is a term of the agreement rather than
 *  something the parent ticked — printed with a neutral marker, not a red ✕. */
function AgreementRow({ agreed, label, detail }: { agreed: boolean | null; label: string; detail: string }) {
  return (
    <div className="flex gap-3 text-sm agreement-row">
      <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
        agreed === null ? 'bg-gray-100 text-gray-400'
          : agreed ? 'bg-gray-900 text-white'
          : 'bg-red-100 text-red-600'
      }`}>
        {agreed === null ? '§' : agreed ? '✓' : '✕'}
      </span>
      <div>
        <p className="font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5 whitespace-pre-line">{detail}</p>
      </div>
    </div>
  )
}
