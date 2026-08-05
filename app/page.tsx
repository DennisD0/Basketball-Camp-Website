import Link from 'next/link'
import StickyNav from '@/components/landing/sticky-nav'
import AnimateIn from '@/components/landing/animate-in'
import { getRegistrationConfig } from '@/lib/get-registration-config'

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const { config } = await getRegistrationConfig()
  const { programInfo, packages, sports } = config

  const locationText = programInfo.locationLine.replace(/^\S+\s*/, '')
  const commaIdx = locationText.indexOf(',')
  const locationValue = commaIdx >= 0 ? locationText.slice(0, commaIdx) : locationText
  const locationSub = commaIdx >= 0 ? locationText.slice(commaIdx + 1).trim() : ''
  const scheduleRows = sports.flatMap(({ sport: s, slots }) =>
    slots.map((slot, i) => ({ sport: s, time: slot.time, ages: slot.ages, key: `${s}-${i}` }))
  )
  return (
    <div className="min-h-screen font-sans" style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#EAE4D8' }}>
      <StickyNav />

      {/* Ã¢ââ¬Ã¢ââ¬ HERO Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden" style={{ backgroundColor: '#EAE4D8' }}>
        {/* Hero background photo — kids team huddle */}
        <img
          src="https://images.unsplash.com/photo-1520399636535-24741e71b160?w=1400&q=75"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ opacity: 0.12 }}
        />

        {/* Soft ghost watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden>
          <span
            className="text-stroke font-black text-brand-navy animate-pulse-bg"
            style={{ fontSize: 'clamp(200px, 40vw, 560px)', lineHeight: 1, letterSpacing: '-0.05em' }}
          >
            413
          </span>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pt-28 pb-20">
          <AnimateIn delay={0}>
            <div className="inline-flex items-center gap-2 bg-brand-orange/10 text-brand-orange text-xs font-semibold px-4 py-1.5 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
              Summer 2026 · Oakland Gardens, NY
            </div>
          </AnimateIn>

          <AnimateIn delay={80}>
            <h1
              className="font-bold text-brand-navy leading-[1.1] mb-6"
              style={{ fontSize: 'clamp(40px, 7vw, 88px)', letterSpacing: '-0.025em' }}
            >
              Help your child<br />
              become the <span className="text-brand-orange">best player</span><br />
              on their team.
            </h1>
          </AnimateIn>

          <AnimateIn delay={160}>
            <p className="text-brand-navy/55 text-lg max-w-md mb-10 leading-relaxed">
              Skill-focused basketball &amp; volleyball training for ages 12–16.
              Small groups, real coaching, real results.
            </p>
          </AnimateIn>

          <AnimateIn delay={240}>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-brand-orange text-white font-semibold text-sm px-7 py-3.5 rounded-full hover:bg-brand-navy transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md hover:-translate-y-0.5"
              >
                Register for Summer 2026
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <a
                href="#programs"
                className="inline-flex items-center gap-2 border border-brand-navy/25 text-brand-navy font-semibold text-sm px-7 py-3.5 rounded-full hover:bg-brand-navy hover:text-white hover:border-brand-navy transition-all duration-200 active:scale-95"
              >
                See Programs
              </a>
            </div>
          </AnimateIn>
        </div>

        {/* Stats strip */}
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pb-16 w-full">
          <AnimateIn delay={320}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { n: '2', label: 'Sports' },
                { n: '5–7', label: 'Sessions per package' },
                { n: 'Ages 5–18', label: 'Age range' },
                { n: '15 yrs', label: 'Coach experience' },
              ].map(({ n, label }) => (
                <div key={label} className="bg-white/60 rounded-2xl px-5 py-4 backdrop-blur-sm ring-1 ring-brand-navy/5">
                  <p className="font-bold text-brand-navy text-xl tracking-tight">{n}</p>
                  <p className="text-brand-navy/45 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Ã¢ââ¬Ã¢ââ¬ WHY 413 Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ */}
      <section className="bg-white py-24 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <AnimateIn>
            <div className="text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-orange mb-3">Why 413</p>
              <h2 className="font-bold text-brand-navy text-3xl sm:text-4xl" style={{ letterSpacing: '-0.02em' }}>
                More than just showing up.
              </h2>
              <p className="text-brand-navy/50 mt-3 max-w-md mx-auto text-base leading-relaxed">
                Most youth programs focus on getting kids on the court. We focus on making sure they actually improve every session.
              </p>
            </div>
          </AnimateIn>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: 'target',
                title: 'Skill-First Training',
                desc: 'Every drill has a purpose. We identify each player\'s weak points and work on them directly, not just run the same routine every week.',
              },
              {
                icon: 'eye',
                title: 'Individual Attention',
                desc: 'Coach Ben watches every player in every session. Small group sizes mean your child actually gets seen, corrected, and pushed.',
              },
              {
                icon: 'chart',
                title: 'Progressive Curriculum',
                desc: 'Each of the 4 weeks builds on the last — fundamentals, skill-building, competition prep, and a final showcase.',
              },
            ].map(({ icon, title, desc }, i) => (
              <AnimateIn key={title} delay={i * 80}>
                <div className="bg-[#EAE4D8] rounded-2xl p-7 ring-1 ring-brand-navy/5 hover:-translate-y-1 hover:shadow-md transition-all duration-200 h-full">
                  {icon === 'target' && <div className="w-10 h-10 mb-4 rounded-xl bg-brand-orange/10 flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C85A1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div>}
{icon === 'eye' && <div className="w-10 h-10 mb-4 rounded-xl bg-brand-teal/10 flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2C6E6A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></div>}
{icon === 'chart' && <div className="w-10 h-10 mb-4 rounded-xl bg-brand-navy/10 flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D3875" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>}
                  <h3 className="font-bold text-brand-navy text-base mb-2">{title}</h3>
                  <p className="text-brand-navy/50 text-sm leading-relaxed">{desc}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Ã¢ââ¬Ã¢ââ¬ PHOTO STRIP Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ */}
      <section className="py-6 px-5 sm:px-8" style={{ backgroundColor: '#EAE4D8' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <AnimateIn delay={0} className="col-span-1">
              <div className="rounded-2xl overflow-hidden aspect-[3/4]">
                <img
                  src="https://images.unsplash.com/photo-1653015503992-347de54a8125?w=600&q=80"
                  alt="Young player holding basketball"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            </AnimateIn>
            <AnimateIn delay={80} className="col-span-1">
              <div className="rounded-2xl overflow-hidden aspect-[3/4]">
                <img
                  src="https://images.unsplash.com/photo-1518614368389-5160c0b0de72?w=600&q=80"
                  alt="Youth basketball game in gym"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            </AnimateIn>
            <AnimateIn delay={160} className="col-span-1">
              <div className="rounded-2xl overflow-hidden aspect-[3/4]">
                <img
                  src="https://images.unsplash.com/photo-1525914813433-886dc018469d?w=600&q=80"
                  alt="Young player going up for a shot"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Ã¢ââ¬Ã¢ââ¬ PROGRAMS Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ */}
      <section id="programs" className="py-24 px-5 sm:px-8" style={{ backgroundColor: '#EAE4D8' }}>
        <div className="max-w-6xl mx-auto">
          <AnimateIn>
            <div className="mb-12">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-orange mb-3">Programs</p>
              <h2 className="font-bold text-brand-navy text-3xl sm:text-4xl" style={{ letterSpacing: '-0.02em' }}>
                Choose your sport.
              </h2>
            </div>
          </AnimateIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimateIn delay={0}>
              <ProgramCard
                sport="Basketball"
                tagline="Ball-handling to competitive play"
                accentColor="bg-brand-navy"
                textColor="text-brand-navy"
                skills={['Ball-handling & dribbling', 'Shooting mechanics', 'On-ball defense', 'Game IQ & spacing']}
                scheduleLabel="Tuesdays + Fridays · Ages 5–12"
                imageSrc="https://images.unsplash.com/photo-1518614368389-5160c0b0de72?w=800&q=80"
              />
            </AnimateIn>
            <AnimateIn delay={100}>
              <ProgramCard
                sport="Volleyball"
                tagline="Serve, pass, and compete"
                accentColor="bg-brand-teal"
                textColor="text-brand-teal"
                skills={['Serving consistency', 'Platform passing', 'Setting fundamentals', 'Match-ready positioning']}
                scheduleLabel="Saturdays 1–3PM · MS–HS"
                imageSrc="https://images.unsplash.com/photo-1659468551117-8255d708e197?w=800&q=80"
              />
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Ã¢ââ¬Ã¢ââ¬ TRAINING STRUCTURE Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ */}
      <section className="bg-white py-24 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <AnimateIn>
            <div className="mb-12">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-orange mb-3">4-Week Curriculum</p>
              <h2 className="font-bold text-brand-navy text-3xl sm:text-4xl" style={{ letterSpacing: '-0.02em' }}>
                Every session has a purpose.
              </h2>
            </div>
          </AnimateIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { week: 1, theme: 'Fundamentals', color: 'bg-brand-navy', desc: 'Footwork, core mechanics, and player assessment. We map out where each player is.' },
              { week: 2, theme: 'Skill Building', color: 'bg-brand-teal', desc: 'Sport-specific drills targeting the gaps found in week one. Deliberate practice.' },
              { week: 3, theme: 'Competition', color: 'bg-brand-orange', desc: 'Controlled scrimmages to test skills under pressure. Coaching cues in real time.' },
              { week: 4, theme: 'Showcase', color: 'bg-brand-navy', desc: 'Full competitive session. Players demonstrate their growth to coaches and family.' },
            ].map(({ week, theme, color, desc }, i) => (
              <AnimateIn key={week} delay={i * 70}>
                <div className="bg-[#EAE4D8] rounded-2xl p-6 ring-1 ring-brand-navy/5 hover:-translate-y-1 hover:shadow-md transition-all duration-200 h-full">
                  <div className={`w-8 h-8 ${color} rounded-xl flex items-center justify-center text-white text-sm font-bold mb-4`}>
                    {week}
                  </div>
                  <p className="font-bold text-brand-navy text-base mb-2">{theme}</p>
                  <p className="text-brand-navy/45 text-sm leading-relaxed">{desc}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Ã¢ââ¬Ã¢ââ¬ COACH Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ */}
      <section id="coach" className="py-24 px-5 sm:px-8" style={{ backgroundColor: '#EAE4D8' }}>
        <div className="max-w-6xl mx-auto">
          <AnimateIn>
            <div className="bg-white rounded-3xl overflow-hidden ring-1 ring-brand-navy/5 shadow-sm">
              <div className="grid md:grid-cols-5 gap-0">
                {/* Photo */}
                <div className="md:col-span-2 bg-gradient-to-br from-brand-teal to-brand-navy min-h-64 relative flex items-end p-7">
                  {/* Swap with: <img src="/coach-ben.jpg" className="absolute inset-0 w-full h-full object-cover" /> */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-10">
                    <span className="font-black text-white" style={{ fontSize: 180 }}>B</span>
                  </div>
                  <div className="relative">
                    <p className="text-white font-bold text-xl">Coach Ben</p>
                    <p className="text-white/60 text-sm">Head Coach &amp; Founder</p>
                  </div>
                </div>

                {/* Bio */}
                <div className="md:col-span-3 p-8 sm:p-10 flex flex-col justify-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-brand-orange mb-4">The Coach</p>
                  <h2 className="font-bold text-brand-navy text-2xl sm:text-3xl mb-5" style={{ letterSpacing: '-0.02em' }}>
                    Coached by someone<br />who lived it.
                  </h2>
                  <p className="text-brand-navy/55 leading-relaxed mb-7 text-sm sm:text-base">
                    Coach Ben played high school varsity volleyball, served as team captain, and was part of the{' '}
                    <strong className="text-brand-navy font-semibold">2015 PSAL Championship</strong> squad.
                    As a full-time middle school teacher, he brings{' '}
                    <strong className="text-brand-navy font-semibold">15+ years of player development</strong> to every session.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      ['2015', 'PSAL Champion'],
                      ['Varsity', 'Team Captain'],
                      ['MS Teacher', 'Educator'],
                      ['15+ Yrs', 'Coaching'],
                    ].map(([n, l]) => (
                      <div key={l} className="flex items-center gap-3">
                        <div className="w-1 h-8 rounded-full bg-brand-orange flex-shrink-0" />
                        <div>
                          <p className="font-bold text-brand-navy text-sm">{n}</p>
                          <p className="text-brand-navy/40 text-xs">{l}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Ã¢ââ¬Ã¢ââ¬ TESTIMONIALS Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ */}
      <section className="bg-white py-24 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <AnimateIn>
            <div className="mb-12">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-orange mb-3">Reviews</p>
              <h2 className="font-bold text-brand-navy text-3xl sm:text-4xl" style={{ letterSpacing: '-0.02em' }}>
                What families say.
              </h2>
            </div>
          </AnimateIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                quote: "My son came in barely able to dribble with his left hand. Four weeks later his handles were completely different. Coach Ben doesn't let you coast.",
                name: 'Maria T.',
                role: 'Parent — U14 Basketball',
              },
              {
                quote: "My daughter wanted to make her school volleyball team. After this program she not only made it — she started. The fundamentals coaching here is real.",
                name: 'James K.',
                role: 'Parent — U16 Volleyball',
              },
              {
                quote: "I've been to other summer programs. This is different because Coach Ben actually watches your form and tells you what to fix. Every drill had a reason.",
                name: 'Kayla R.',
                role: 'Player — U14 Basketball',
              },
            ].map(({ quote, name, role }, i) => (
              <AnimateIn key={name} delay={i * 80}>
                <div className="bg-[#EAE4D8] rounded-2xl p-7 ring-1 ring-brand-navy/5 hover:-translate-y-1 hover:shadow-md transition-all duration-200 h-full flex flex-col">
                  <div className="flex gap-0.5 mb-5">
                    {[...Array(5)].map((_, j) => (
                      <svg key={j} width="14" height="14" viewBox="0 0 24 24" fill="#C85A1E"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    ))}
                  </div>
                  <p className="text-brand-navy/65 text-sm leading-relaxed flex-1 mb-5">&ldquo;{quote}&rdquo;</p>
                  <div>
                    <p className="font-semibold text-brand-navy text-sm">{name}</p>
                    <p className="text-brand-navy/40 text-xs mt-0.5">{role}</p>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Ã¢ââ¬Ã¢ââ¬ SCHEDULE Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ */}
      <section id="schedule" className="py-24 px-5 sm:px-8" style={{ backgroundColor: '#EAE4D8' }}>
        <div className="max-w-6xl mx-auto">
          <AnimateIn>
            <div className="grid md:grid-cols-2 gap-10">
              {/* Info */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-orange mb-3">When &amp; Where</p>
                <h2 className="font-bold text-brand-navy text-3xl sm:text-4xl mb-8" style={{ letterSpacing: '-0.02em' }}>
                  See you on the court.
                </h2>
                <div className="space-y-5">
                  {[
                    { label: 'Location', value: locationValue, sub: locationSub },
                    { label: 'Packages', value: packages.slice(0, 2).map(p => `${p.label} ${p.price}`).join(' · '), sub: packages.slice(2).map(p => `${p.label} ${p.price}`).join(' · ') },
                    { label: 'Payment', value: programInfo.paymentMethod, sub: programInfo.paymentNote },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="bg-white rounded-2xl px-5 py-4 ring-1 ring-brand-navy/5">
                      <p className="text-xs text-brand-navy/40 font-medium uppercase tracking-wider mb-1">{label}</p>
                      <p className="font-semibold text-brand-navy text-sm">{value}</p>
                      {sub && <p className="text-brand-navy/40 text-xs mt-0.5">{sub}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-orange mb-3">Weekly Schedule</p>
                <div className="bg-white rounded-2xl overflow-hidden ring-1 ring-brand-navy/5 mb-5">
                  {scheduleRows.map(({ sport: s, time, ages, key }, i) => (
                    <div key={key} className={`flex items-center justify-between gap-4 px-6 py-5 ${i < scheduleRows.length - 1 ? 'border-b border-brand-navy/5' : ''}`}>
                      <div>
                        <p className="font-semibold text-brand-navy text-sm">{s} · {time}</p>
                        <p className="text-brand-navy/40 text-xs mt-0.5">{ages}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-brand-navy/5 rounded-2xl px-5 py-5 ring-1 ring-brand-navy/10">
                  <p className="text-xs font-semibold text-brand-navy/50 uppercase tracking-wider mb-2">Our Promise</p>
                  <p className="text-brand-navy/60 text-sm leading-relaxed">
                    If your child attends every session and doesn&apos;t show measurable improvement,
                    we&apos;ll work with them one-on-one at no extra charge.
                  </p>
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Ã¢ââ¬Ã¢ââ¬ PRICING Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ */}
      <section id="pricing" className="bg-white py-24 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <AnimateIn>
            <div className="mb-12">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-orange mb-3">Pricing</p>
              <h2 className="font-bold text-brand-navy text-3xl sm:text-4xl" style={{ letterSpacing: '-0.02em' }}>
                Pick your plan.
              </h2>
            </div>
          </AnimateIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {packages.map((p, i) => {
              const hot = p.badge !== null
              return (
                <AnimateIn key={p.value} delay={i * 70}>
                  <div className={`rounded-2xl p-7 ring-1 transition-all duration-200 hover:-translate-y-1 hover:shadow-md h-full flex flex-col ${
                    hot
                      ? 'bg-brand-navy ring-brand-navy'
                      : 'bg-[#EAE4D8] ring-brand-navy/10 hover:ring-brand-navy/20'
                  }`}>
                    {hot && (
                      <span className="inline-block bg-brand-orange text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-4 self-start">
                        {p.badge}
                      </span>
                    )}
                    {!hot && <div className="mb-4" />}
                    <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${hot ? 'text-white/50' : 'text-brand-navy/40'}`}>{p.label}</p>
                    <p className={`font-bold text-5xl tracking-tight mb-1 ${hot ? 'text-white' : 'text-brand-navy'}`}>{p.price}</p>
                    <p className={`text-xs mb-7 ${hot ? 'text-white/40' : 'text-brand-navy/30'}`}>{p.description}</p>
                    <Link
                      href="/register"
                      className={`mt-auto block text-center text-sm font-semibold py-3 rounded-xl transition-all duration-200 active:scale-95 ${
                        hot
                          ? 'bg-brand-orange text-white hover:bg-brand-orange/90'
                          : 'bg-white text-brand-navy ring-1 ring-brand-navy/15 hover:bg-brand-navy hover:text-white'
                      }`}
                    >
                      Register Now
                    </Link>
                  </div>
                </AnimateIn>
              )
            })}
          </div>

          <AnimateIn>
            <p className="text-center text-brand-navy/35 text-sm">
              Session packages apply to one sport. Invite a friend to Volleyball and you both get 5% off — just let us know. No hidden fees.
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Ã¢ââ¬Ã¢ââ¬ FAQ Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ */}
      <section className="py-24 px-5 sm:px-8" style={{ backgroundColor: '#EAE4D8' }}>
        <div className="max-w-2xl mx-auto">
          <AnimateIn>
            <div className="mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-orange mb-3">FAQ</p>
              <h2 className="font-bold text-brand-navy text-3xl sm:text-4xl" style={{ letterSpacing: '-0.02em' }}>
                Common questions.
              </h2>
            </div>
          </AnimateIn>

          <div className="space-y-3">
            {[
              { q: 'Do kids pick one sport, or can they do both?', a: 'Each session package applies to one sport — basketball runs Tuesdays and Fridays, volleyball on Saturdays. You can register for both separately, or use a $32 drop-in for either.' },
              { q: 'What skill level is this for?', a: 'All levels. From beginners to players trying to make their school team. Coach Ben adjusts drills per player.' },
              { q: 'What if my child misses a session?', a: 'No make-ups, but Coach Ben will catch them up at the next session personally.' },
              { q: 'How do I pay?', a: 'Zelle to 347-200-4439. Include your child\'s name in the memo. Payment confirms the spot.' },
              { q: 'Is there a refund policy?', a: 'No refunds after payment. For injury situations, contact us directly — we\'ll work something out.' },
            ].map(({ q, a }, i) => (
              <AnimateIn key={q} delay={i * 50}>
                <div className="bg-white rounded-2xl px-6 py-5 ring-1 ring-brand-navy/5 hover:ring-brand-navy/10 transition-all">
                  <p className="font-semibold text-brand-navy text-sm mb-2">{q}</p>
                  <p className="text-brand-navy/50 text-sm leading-relaxed">{a}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Ã¢ââ¬Ã¢ââ¬ FINAL CTA Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ */}
      <section className="bg-brand-orange py-24 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <AnimateIn>
            <div className="bg-white/10 rounded-3xl px-8 sm:px-14 py-14 text-center ring-1 ring-white/20">
              <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-4">Limited Spots · Summer 2026</p>
              <h2 className="font-bold text-white text-3xl sm:text-5xl mb-4" style={{ letterSpacing: '-0.02em' }}>
                Ready to get started?
              </h2>
              <p className="text-white/65 text-base mb-9 max-w-sm mx-auto leading-relaxed">
                Spots fill up early. Register now to lock in your rate before it goes up.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-white text-brand-orange font-bold text-sm px-9 py-4 rounded-full hover:bg-brand-navy hover:text-white transition-all duration-200 active:scale-95 shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                Secure your spot
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Ã¢ââ¬Ã¢ââ¬ FOOTER Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ */}
      <footer className="bg-brand-navy py-12 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <img src="/Logo.jpg" alt="413 Youth Club" className="h-9 w-9 rounded-xl object-cover opacity-90" />
            <div>
              <p className="font-bold text-white text-sm">413 Youth Club</p>
              <p className="text-white/30 text-xs mt-0.5">58-06 Springfield Blvd · Oakland Gardens, NY</p>
            </div>
          </div>
          <div className="flex items-center gap-7">
            <a href="https://www.instagram.com/413youthclub/" target="_blank" rel="noopener noreferrer"
              className="text-white/35 hover:text-white text-xs font-medium transition-colors duration-200">
              Instagram
            </a>
            <Link href="/register" className="text-white/35 hover:text-white text-xs font-medium transition-colors duration-200">Register</Link>
            <Link href="/login" className="text-white/20 hover:text-white/50 text-xs transition-colors duration-200">Staff</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* Ã¢ââ¬Ã¢ââ¬ Sub-components Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬Ã¢ââ¬ */

function ProgramCard({
  sport, tagline, accentColor, textColor, skills, scheduleLabel, imageSrc,
}: {
  sport: string; tagline: string; accentColor: string; textColor: string
  skills: string[]; scheduleLabel: string; imageSrc?: string
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden ring-1 ring-brand-navy/5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200 flex flex-col">
      {imageSrc ? (
        <div className="h-44 overflow-hidden">
          <img src={imageSrc} alt={`${sport} program`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
        </div>
      ) : (
        <div className={`h-1.5 ${accentColor}`} />
      )}
      <div className="p-8 flex flex-col flex-1">
        <p className={`text-xs font-semibold uppercase tracking-widest ${textColor} mb-2`}>{scheduleLabel}</p>
        <h3 className="font-bold text-brand-navy text-2xl mb-1">{sport}</h3>
        <p className="text-brand-navy/45 text-sm mb-6">{tagline}</p>

        <ul className="space-y-2.5 flex-1 mb-8">
          {skills.map(s => (
            <li key={s} className="flex items-center gap-3 text-sm text-brand-navy/65">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${accentColor}`} />
              {s}
            </li>
          ))}
        </ul>

        <Link
          href="/register"
          className={`block text-center text-sm font-semibold py-3 rounded-xl ring-1 ring-brand-navy/10 text-brand-navy hover:bg-brand-navy hover:text-white hover:ring-brand-navy transition-all duration-200 active:scale-95`}
        >
          Register for {sport}
        </Link>
      </div>
    </div>
  )
}
