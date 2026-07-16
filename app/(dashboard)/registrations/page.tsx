import prisma from '@/lib/prisma'
import RegistrationList from '@/components/registrations/registration-list'
import AutoRefresh from '@/components/auto-refresh'

export default async function RegistrationsPage() {
  let registrations: Awaited<ReturnType<typeof prisma.registration.findMany>> = []

  try {
    registrations = await prisma.registration.findMany({
      orderBy: { createdAt: 'desc' },
    })
  } catch {
    return <EmptyState message="Could not reach the database. Add your DATABASE_URL in Vercel environment variables and redeploy." />
  }

  const pendingCount = registrations.filter(r => r.status === 'PENDING').length

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-condensed font-bold text-2xl text-brand-navy tracking-wide">Registrations</h1>
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-gray-300">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
          <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
        </svg>
      </div>
      <h2 className="font-condensed font-bold text-xl text-brand-navy mb-1">No data yet</h2>
      <p className="text-sm text-gray-400 max-w-sm">{message}</p>
    </div>
  )
}
