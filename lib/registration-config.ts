// Single source of truth for everything shown on the public /register page.
// Staff can override all of it from Registrations → Edit Registration Form.

export type ContractSection = { title: string; body: string }
export type SessionPackage = {
  value: string
  label: string
  price: string
  sessions: number
  description: string
  highlight: string | null
  badge: string | null
}
export type SportSchedule = {
  sport: string
  slots: { time: string; ages: string }[]
}
export type ProgramInfo = {
  locationLine: string
  scheduleLines: string[]
  pricingLines: string[]
  paymentMethod: string
  paymentNote: string
}
export type RegistrationConfig = {
  programInfo: ProgramInfo
  packages: SessionPackage[]
  sports: SportSchedule[]
  contractSections: ContractSection[]
}

export const DEFAULT_CONFIG: RegistrationConfig = {
  programInfo: {
    locationLine: '📍 58-06 Springfield Blvd, Oakland Gardens, NY',
    scheduleLines: [
      '🏀 Basketball — Tue 4–5PM (ages 7–12)',
      '🏀 Basketball — Fri 4–5PM (ages 5–9) · Fri 5–6PM (ages 9–12)',
      '🏐 Volleyball — Sat 1–3PM (middle school – high school)',
      '🚗 Free parking available',
    ],
    pricingLines: [
      '5 sessions — $150 (complete within 7 weeks)',
      '7 sessions — $200 (complete within 9 weeks)',
      'Drop-in — $32 (one day pass, either sport)',
    ],
    paymentMethod: 'Zelle: 347-200-4439',
    paymentNote: "Include child's name in memo",
  },
  packages: [
    { value: '5_sessions', label: '5 Sessions', price: '$150', sessions: 5, description: '5 classes', highlight: 'complete within 7 weeks', badge: null },
    { value: '7_sessions', label: '7 Sessions', price: '$200', sessions: 7, description: '7 classes', highlight: 'complete within 9 weeks', badge: 'Best Value' },
    { value: 'drop_in', label: 'Drop-in', price: '$32', sessions: 1, description: 'Single class', highlight: null, badge: null },
  ],
  sports: [
    {
      sport: 'Basketball',
      slots: [
        { time: 'Tue 4–5PM', ages: 'Ages 7–12' },
        { time: 'Fri 4–5PM', ages: 'Ages 5–9' },
        { time: 'Fri 5–6PM', ages: 'Ages 9–12' },
      ],
    },
    {
      sport: 'Volleyball',
      slots: [{ time: 'Sat 1–3PM', ages: 'Middle–High School' }],
    },
  ],
  contractSections: [
    {
      title: 'Program Commitment',
      body: 'By registering, you agree that your child will participate exclusively in the 413 Youth Club program for the duration of the selected session package — the 7-week period for the 5-session package, or the 9-week period for the 7-session package. During this time window, your child may not compete on or be rostered for another team or club in the same sport.',
    },
    {
      title: 'Injury Liability Waiver',
      body: 'Participation in basketball and volleyball carries an inherent risk of injury. By registering, you acknowledge these risks and release 413 Youth Club, its coaches, and staff from liability for any injury that may occur during sessions or events.',
    },
    {
      title: 'No Refund Policy',
      body: 'All session packages are non-refundable once purchased. In the event of cancellation by the club (e.g., weather, facility issues), a make-up session will be scheduled. No cash refunds will be issued.',
    },
    {
      title: 'Media Consent',
      body: "If consented during registration, your child may appear in photos and videos used for promotional and social media purposes. Without consent, your child's image will not be used.",
    },
    {
      title: 'Drop-in Policy',
      body: 'Drop-in sessions ($32/class) are pay-per-visit with no package commitment. Drop-in participants may attend available sessions subject to capacity. Drop-in does not apply toward session package counts.',
    },
    {
      title: 'Sibling / Friend Discount',
      body: 'If you are registering with a sibling or friend and have provided their name, both parties will receive $20 off their package. The discount must be verified by an admin before it is applied. This offer is exclusive to Volleyball registrations.',
    },
  ],
}

export function mergeConfig(partial: Partial<RegistrationConfig> | null | undefined): RegistrationConfig {
  if (!partial) return DEFAULT_CONFIG
  return {
    programInfo: { ...DEFAULT_CONFIG.programInfo, ...partial.programInfo },
    packages: partial.packages?.length ? partial.packages : DEFAULT_CONFIG.packages,
    sports: partial.sports?.length ? partial.sports : DEFAULT_CONFIG.sports,
    contractSections: partial.contractSections?.length ? partial.contractSections : DEFAULT_CONFIG.contractSections,
  }
}
