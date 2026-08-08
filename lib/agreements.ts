/**
 * The four agreements a parent ticks on /register, and the record of them
 * printed on the contract.
 *
 * Both screens read this list. They used to hold separate copies of the wording,
 * which is how the contract ended up showing a different set of terms from the
 * form the parent actually signed — the contract printed three hardcoded rows
 * while the form asked for four. Never inline this text again.
 *
 * Not the same thing as `contractSections` in lib/registration-config.ts: those
 * are the long-form terms staff can edit, shown as reference copy on /register.
 * These four are the consents themselves.
 */
export type AgreementKey = 'injuryWaiver' | 'noRefundAck' | 'sessionWindow' | 'mediaConsent'

export const AGREEMENTS: Record<AgreementKey, { title: string; body: string; required: boolean }> = {
  injuryWaiver: {
    title: 'Injury Liability Waiver',
    body: 'I acknowledge the risks of physical activity and release 413 Youth Club and its staff from liability for injury during sessions.',
    required: true,
  },
  noRefundAck: {
    title: 'No Refund Policy',
    body: 'I understand that session packages are non-refundable. Make-up sessions will be offered for club-cancelled classes.',
    required: true,
  },
  sessionWindow: {
    title: 'Session Window',
    body: 'I understand that all purchased sessions must be completed within the program window (7 weeks for the 5-session package; 9 weeks for the 7-session package). Sessions do not carry over beyond the window.',
    required: true,
  },
  mediaConsent: {
    title: 'Media Consent',
    body: 'I give permission for my child to appear in photos/videos for promotional and social media use.',
    required: false,
  },
}

/** Display order — must match the order the parent sees on the form. */
export const AGREEMENT_ORDER: AgreementKey[] = [
  'injuryWaiver',
  'noRefundAck',
  'sessionWindow',
  'mediaConsent',
]

/** The single-line form used for the registration form's checkbox labels. */
export function agreementLabel(key: AgreementKey): string {
  return `${AGREEMENTS[key].title} — ${AGREEMENTS[key].body}`
}
