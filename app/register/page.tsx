import RegistrationForm from '@/components/register/registration-form'

export default function RegisterPage() {
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
            <h3 className="font-semibold text-brand-navy mb-3">Program Details</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2"><span className="text-brand-teal">📍</span> 58-06 Springfield Blvd, Oakland Gardens, NY</li>
              <li className="flex gap-2"><span className="text-brand-teal">📅</span> July 6 – August 1</li>
              <li className="flex gap-2"><span className="text-brand-teal">🏀</span> Basketball — Mon 6:30–8:30PM · Sat 2:00–4:00PM</li>
              <li className="flex gap-2"><span className="text-brand-teal">🏐</span> Volleyball — Mon 6:30–8:30PM · Sat 2:00–4:00PM</li>
              <li className="flex gap-2"><span className="text-brand-teal">🚗</span> Free parking available</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-brand-navy mb-3">Payment</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>Zelle: <span className="font-medium text-gray-800">347-200-4439</span></li>
              <li>Venmo: <span className="font-medium text-gray-800">@benro97</span></li>
              <li className="text-xs text-gray-400 pt-1">Include child's name in memo</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm ring-1 ring-black/5">
        <RegistrationForm />
      </div>
    </div>
  )
}
