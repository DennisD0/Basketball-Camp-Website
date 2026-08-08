/**
 * The package choices staff can pick from. Shared by the two places a package
 * can be started — Add Member and the renewal modal — so the two never drift.
 *
 * Client-safe on purpose: no prisma import, unlike `lib/packages.ts`.
 */
export type PackagePreset = { label: string; sessions: number; type: string }

export const PACKAGE_PRESETS: PackagePreset[] = [
  { label: '5 Sessions', sessions: 5, type: 'Bronze' },
  { label: '7 Sessions', sessions: 7, type: 'Silver' },
  { label: 'Drop-in',    sessions: 1, type: 'Drop-in' },
]

/** The preset offered first when nothing else is known. */
export const DEFAULT_PRESET = PACKAGE_PRESETS[1]

/** Local-time today as yyyy-mm-dd, for prefilling a date input. */
export function todayISO(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}
