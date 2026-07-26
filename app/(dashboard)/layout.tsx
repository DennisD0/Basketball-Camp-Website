import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Nav from '@/components/nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  if (!cookieStore.has('auth')) redirect('/login')

  return (
    <div className="min-h-screen bg-[#F4F2EE]">
      <Nav />
      {/* md+: offset for the fixed 240px sidebar; mobile: full width with bottom-tab padding */}
      <main className="md:pl-60">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-28 md:pb-10 animate-page-enter">
          {children}
        </div>
      </main>
    </div>
  )
}
