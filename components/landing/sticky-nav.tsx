'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function StickyNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled || menuOpen
        ? 'bg-[#EAE4D8]/95 backdrop-blur-md border-b border-brand-navy/10 shadow-sm'
        : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <img src="/Logo.jpg" alt="413 Youth Club" className="h-9 w-9 rounded-xl object-cover" />
          <span className="font-bold text-brand-navy text-sm tracking-tight hidden sm:block">413 Youth Club</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7">
          {[
            { label: 'Programs', href: '#programs' },
            { label: 'Schedule', href: '#schedule' },
            { label: 'Coach', href: '#coach' },
            { label: 'Pricing', href: '#pricing' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="relative text-sm font-medium text-brand-navy/60 hover:text-brand-navy transition-colors duration-200 after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:bg-brand-orange after:transition-all after:duration-250 hover:after:w-full"
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTA row */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-semibold text-brand-navy border border-brand-navy/30 px-4 py-2 rounded-full hover:bg-brand-navy hover:text-white hover:border-brand-navy transition-all duration-200 active:scale-95"
          >
            Staff Login
          </Link>
          <Link
            href="/register"
            className="bg-brand-orange text-white text-xs font-bold px-5 py-2.5 rounded-full hover:bg-brand-navy transition-all duration-200 active:scale-95 shadow-sm"
          >
            Register →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-1.5 rounded-lg hover:bg-brand-navy/5 transition-colors active:scale-95"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          <div className={`w-5 h-0.5 bg-brand-navy mb-1.5 transition-all duration-200 origin-center ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <div className={`w-5 h-0.5 bg-brand-navy mb-1.5 transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
          <div className={`w-5 h-0.5 bg-brand-navy transition-all duration-200 origin-center ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-96' : 'max-h-0'}`}>
        <div className="bg-[#EAE4D8]/98 px-5 pb-6 pt-4 space-y-1 border-t border-brand-navy/10">
          {[
            { label: 'Programs', href: '#programs' },
            { label: 'Schedule', href: '#schedule' },
            { label: 'Coach', href: '#coach' },
            { label: 'Pricing', href: '#pricing' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="block py-3 text-sm font-medium text-brand-navy/70 hover:text-brand-navy border-b border-brand-navy/5 transition-colors"
            >
              {label}
            </a>
          ))}
          <div className="pt-4 flex flex-col gap-3">
            <Link
              href="/register"
              onClick={() => setMenuOpen(false)}
              className="block bg-brand-orange text-white text-sm font-bold text-center py-3 rounded-xl hover:bg-brand-navy transition-all active:scale-95"
            >
              Register Now →
            </Link>
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="block border border-brand-navy/20 text-brand-navy text-sm font-semibold text-center py-2.5 rounded-xl hover:bg-brand-navy hover:text-white transition-all active:scale-95"
            >
              Staff Login
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
