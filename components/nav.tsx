'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV_LINKS = [
  {
    href: '/attendance',
    label: 'Attendance',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: '/members',
    label: 'Members',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/finances',
    label: 'Finances',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    href: '/registrations',
    label: 'Register',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    href: '/trials',
    label: 'Trials',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
  },
  {
    href: '/import',
    label: 'Import',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polyline points="16 16 12 12 8 16" />
        <line x1="12" y1="12" x2="12" y2="21" />
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
      </svg>
    ),
  },
]

function SignOutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5 w-[18px] h-[18px]">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
  }

  return (
    <>
      {/* ── Desktop left sidebar (md+) ── */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-60 bg-white border-r border-black/5 z-40">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 h-[68px] border-b border-black/5">
          <img src="/Logo.jpg" alt="413" className="h-9 w-9 rounded-xl object-cover shadow-sm" />
          <div className="leading-tight">
            <p className="font-condensed font-bold text-[15px] text-brand-navy tracking-wide uppercase">413 Youth Club</p>
            <p className="text-[10px] text-gray-400 font-medium">Club Management</p>
          </div>
        </div>

        {/* Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_LINKS.map(link => {
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  active
                    ? 'bg-brand-teal/10 text-brand-teal'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-brand-navy'
                }`}
              >
                {/* Active indicator bar */}
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-brand-teal transition-all duration-200 ${
                  active ? 'h-5 opacity-100' : 'h-0 opacity-0'
                }`} />
                <span className={active ? 'text-brand-teal' : 'text-gray-400 group-hover:text-brand-navy'}>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-black/5">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-150"
          >
            <SignOutIcon />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar (< md) ── */}
      <nav className="md:hidden bg-brand-teal text-white shadow-md shadow-[#2C6E6A]/30">
        <div className="flex items-center justify-between px-4" style={{ height: '52px' }}>
          <div className="flex items-center gap-2.5">
            <img src="/Logo.jpg" alt="413" className="h-8 w-8 rounded-xl object-cover shadow-sm" />
            <span className="font-condensed font-bold text-base tracking-wide uppercase">413 Youth Club</span>
          </div>
          <button
            onClick={handleSignOut}
            className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-white/10 text-white/90 active:bg-white/20 transition-all"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* ── Mobile floating bottom tab bar (< md) ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-5" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
        <nav className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-black/15 ring-1 ring-black/8">
          <div className="flex px-2 py-2">
            {NAV_LINKS.map(link => {
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all duration-150 cursor-pointer ${
                    active ? 'bg-brand-teal/10' : 'active:bg-gray-100'
                  }`}
                >
                  <span className={active ? 'text-brand-teal' : 'text-gray-400'}>{link.icon}</span>
                  <span className={`text-[10px] font-semibold leading-none ${active ? 'text-brand-teal' : 'text-gray-400'}`}>
                    {link.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </>
  )
}
