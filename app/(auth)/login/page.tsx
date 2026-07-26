'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (!res.ok) {
      setError('Wrong password — try again.')
      setLoading(false)
      return
    }

    router.push('/attendance')
    router.refresh()
  }

  return (
    <div className="min-h-dvh bg-[#F4F2EE] flex">
      {/* ── Brand panel (lg+) ── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-brand-navy relative overflow-hidden p-10">
        {/* Ghost numeral */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden>
          <span className="text-stroke font-black text-white/60 animate-pulse-bg" style={{ fontSize: 'clamp(200px, 28vw, 420px)', lineHeight: 1, letterSpacing: '-0.05em' }}>
            413
          </span>
        </div>
        <div className="relative flex items-center gap-3">
          <img src="/Logo.jpg" alt="413 Youth Club" className="h-10 w-10 rounded-xl object-cover shadow-md" />
          <span className="font-condensed font-bold text-white text-lg tracking-wide uppercase">413 Youth Club</span>
        </div>
        <div className="relative">
          <h2 className="font-condensed font-bold text-white text-4xl leading-tight mb-3">
            Run the club.<br />All in one place.
          </h2>
          <p className="text-white/50 text-sm max-w-xs leading-relaxed">
            Attendance, members, finances, trials, and registrations — everything a coach needs, on any device.
          </p>
        </div>
        <p className="relative text-white/25 text-xs">Oakland Gardens, NY</p>
      </div>

      {/* ── Form panel ── */}
      <div className="flex-1 flex items-center justify-center p-5">
        <div className="w-full max-w-sm animate-page-enter">
          {/* Mobile brand header */}
          <div className="text-center mb-8 lg:hidden">
            <img src="/Logo.jpg" alt="413 Youth Club" className="h-20 w-20 mx-auto mb-4 rounded-2xl object-cover shadow-md" />
            <h1 className="font-condensed font-bold text-2xl text-brand-navy uppercase tracking-wide">413 Youth Club</h1>
            <p className="text-sm text-gray-400 mt-1">Club Management Portal</p>
          </div>

          <div className="hidden lg:block mb-8">
            <h1 className="font-condensed font-bold text-3xl text-brand-navy">Welcome back</h1>
            <p className="text-sm text-gray-400 mt-1.5">Sign in to the management portal</p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm ring-1 ring-black/5 p-7">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    className="w-full min-h-[48px] px-4 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-teal/50 focus:border-transparent text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-brand-navy transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3.5 py-2.5" role="alert">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] bg-brand-navy text-white rounded-xl hover:bg-brand-navy/90 disabled:opacity-50 font-semibold text-sm transition-all active:scale-[0.98]"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
