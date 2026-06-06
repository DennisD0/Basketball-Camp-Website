'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
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
      setError('Wrong password')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/Logo.jpg" alt="413 Youth Club" className="h-24 w-auto mx-auto mb-4 rounded-lg" />
          <h1 className="text-2xl font-bold text-brand-navy">413 Youth Club</h1>
          <p className="text-sm text-brand-navy/60 mt-1">Club Management Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-navy text-sm"
              />
            </div>

            {error && <p className="text-sm text-brand-orange">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-navy text-white py-2 px-4 rounded-lg hover:bg-brand-navy/90 disabled:opacity-50 font-medium text-sm transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
