import prisma from '@/lib/prisma'
import RegistrationList from '@/components/registrations/registration-list'

export default async function RegistrationsPage() {
  const registrations = await prisma.registration.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const pendingCount = registrations.filter(r => r.status === 'PENDING').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Registrations</h1>
          <p className="text-sm text-gray-400 mt-0.5">Parents who registered via the public form</p>
        </div>
        {pendingCount > 0 && (
          <span className="bg-brand-orange/10 text-brand-orange text-xs font-semibold px-3 py-1.5 rounded-full">
            {pendingCount} pending
          </span>
        )}
      </div>

      {registrations.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm ring-1 ring-black/5">
          No registrations yet. Share your public registration link to start receiving signups.
        </div>
      ) : (
        <RegistrationList registrations={registrations} />
      )}
    </div>
  )
}
