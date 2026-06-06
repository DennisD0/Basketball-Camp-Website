import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Register — 413 Youth Club',
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F4F2EE]">
      <header className="bg-brand-teal text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/Logo.jpg" alt="413" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-bold">413 Youth Club</span>
          </div>
          <a href="/" className="text-sm text-white/70 hover:text-white transition-colors">← Back</a>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {children}
      </main>
    </div>
  )
}
