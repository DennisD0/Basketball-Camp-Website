'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/members', label: 'Members' },
  { href: '/finances', label: 'Finances' },
  { href: '/registrations', label: 'Registrations' },
]

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="bg-brand-teal text-white shadow-md shadow-[#2C6E6A]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8 min-w-0">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <img src="/Logo.jpg" alt="413" className="h-8 w-8 rounded-lg object-cover" />
              <span className="font-bold text-base tracking-tight whitespace-nowrap hidden sm:inline">413 Youth Club</span>
            </div>
            <div className="flex gap-1 overflow-x-auto min-w-0">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                    pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href + '/'))
                      ? 'bg-white/20 shadow-inner'
                      : 'hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm px-4 py-1.5 rounded-full border border-white/25 hover:bg-white/10 transition-all duration-150 whitespace-nowrap flex-shrink-0"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
