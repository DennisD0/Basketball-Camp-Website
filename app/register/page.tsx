import RegistrationForm from '@/components/register/registration-form'
import { getRegistrationConfig } from '@/lib/get-registration-config'

export const dynamic = 'force-dynamic'

export default async function RegisterPage() {
  const { config } = await getRegistrationConfig()
  const { programInfo } = config

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-navy">Program Registration</h1>
        <p className="text-gray-500 mt-2">Fill out the form below to register for the 413 Youth Club program. No spot is held until payment is received.</p>
      </div>

      {/* Program summary card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-black/5 mb-8">
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-brand-navy mb-3">Schedule</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2"><span>{programInfo.locationLine.split(' ')[0]}</span> {programInfo.locationLine.replace(/^\S+\s*/, '')}</li>
              {programInfo.scheduleLines.map((line, i) => (
                <li key={i} className="flex gap-2"><span>{line.split(' ')[0]}</span> {line.replace(/^\S+\s*/, '')}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-brand-navy mb-3">Pricing & Payment</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              {programInfo.pricingLines.map((line, i) => <li key={i}>{line}</li>)}
              <li className="pt-1">{programInfo.paymentMethod}</li>
              <li className="text-xs text-gray-400">{programInfo.paymentNote}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm ring-1 ring-black/5">
        <RegistrationForm initialConfig={config} />
      </div>
    </div>
  )
}
