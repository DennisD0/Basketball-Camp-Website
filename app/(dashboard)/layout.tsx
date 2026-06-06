import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Nav from '@/components/nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) redirect('/login')

  return (
    <div className="min-h-screen bg-brand-cream">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
