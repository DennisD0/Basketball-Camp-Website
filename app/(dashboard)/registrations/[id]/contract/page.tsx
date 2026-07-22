import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PrintButton from '@/components/registrations/print-button'

const PROGRAM_LABELS: Record<string, string> = {
  early_bird:   'Early Bird — $350',
  memorial_day: 'Memorial Day Sale — $300',
  regular:      'Regular — $400',
}

const PACKAGE_LABELS: Record<string, string> = {
  '5-week': '5-Week Package (5 classes · complete within 7 weeks)',
  '7-week': '7-Week Package (7 classes · complete within 9 weeks)',
}

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const reg = await prisma.registration.findUnique({ where: { id } })
  if (!reg || reg.status !== 'APPROVED') notFound()

  const registeredOn = new Date(reg.createdAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* Print button — hidden when printing */}
      <div className="no-print flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
        <span className="text-sm text-gray-500">Contract for <strong className="text-gray-800">{reg.childName}</strong></span>
        <PrintButton />
      </div>

      {/* Contract body */}
      <div className="max-w-2xl mx-auto px-8 py-10 font-sans text-gray-900">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold tracking-tight">413 Youth Club</h1>
          <p className="text-sm text-gray-500 mt-1">Registration Agreement</p>
          <p className="text-xs text-gray-400 mt-0.5">Registered: {registeredOn}</p>
        </div>

        <Section title="Student Information">
          <Row label="Child's Name" value={reg.childName} />
          <Row label="Sport" value={reg.sport} />
          <Row label="Age Group" value={reg.ageGroup} />
        </Section>

        <Section title="Program">
          <Row label="Package" value={PACKAGE_LABELS[reg.packageOption] ?? reg.packageOption} />
          <Row label="Pricing Option" value={PROGRAM_LABELS[reg.programOption] ?? reg.programOption} />
        </Section>

        <Section title="Parent / Guardian">
          <Row label="Name" value={reg.parentName} />
          <Row label="Email" value={reg.parentEmail ?? '—'} />
          <Row label="Phone" value={reg.parentPhone} />
          <Row label="WhatsApp Communications" value={reg.whatsappConsent ? 'Agreed' : 'Declined'} />
        </Section>

        <Section title="Agreements">
          <AgreementRow
            agreed={reg.injuryWaiver}
            label="Injury Liability Waiver"
            detail="Parent understands this is a physical activity and releases the coaches and 413 Youth Club from liability for injuries."
          />
          <AgreementRow
            agreed={reg.noRefundAck}
            label="No Refund Policy"
            detail="Parent understands all payments are final and non-refundable."
          />
          <AgreementRow
            agreed={reg.mediaConsent}
            label="Media Consent"
            detail="Parent gives permission for the child to appear in photos/videos for promotional and social media use."
          />
        </Section>

        <Section title="Payment Instructions">
          <p className="text-sm text-gray-600">Zelle: <strong>347-200-4439</strong></p>
          <p className="text-sm text-gray-600 mt-1">Venmo: <strong>@benro97</strong></p>
          <p className="text-xs text-gray-400 mt-2">Include child's name in the memo. No spot is held until payment is received.</p>
        </Section>

        {/* Signature line */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-xs text-gray-400 mb-8">By signing below, the parent/guardian confirms the information above is accurate and agrees to all terms stated in this registration.</p>
          <div className="grid grid-cols-2 gap-12">
            <div>
              <div className="border-b border-gray-900 mb-1 h-8" />
              <p className="text-xs text-gray-500">Parent / Guardian Signature</p>
            </div>
            <div>
              <div className="border-b border-gray-900 mb-1 h-8" />
              <p className="text-xs text-gray-500">Date</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 mt-12">413 Youth Club · Oakland Gardens, NY · 58-06 Springfield Blvd</p>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 border-b border-gray-100 pb-1">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

function AgreementRow({ agreed, label, detail }: { agreed: boolean; label: string; detail: string }) {
  return (
    <div className="flex gap-3 text-sm py-1">
      <span className={`mt-0.5 flex-shrink-0 font-bold ${agreed ? 'text-green-600' : 'text-red-500'}`}>
        {agreed ? '✓' : '✕'}
      </span>
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{detail}</p>
      </div>
    </div>
  )
}
