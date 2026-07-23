const AVATAR_COLORS = [
  'bg-brand-navy', 'bg-brand-teal', 'bg-purple-600', 'bg-blue-600',
  'bg-indigo-600', 'bg-emerald-600',
]

export function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
