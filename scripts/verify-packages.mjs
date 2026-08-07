import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const ms = await p.member.findMany({
  include: {
    packages: { orderBy: { startDate: 'desc' } },
    attendance: { where: { status: 'PRESENT' }, include: { session: { select: { date: true } } } },
  },
  orderBy: { firstName: 'asc' },
})
let mismatch = 0, withPkg = 0
console.log('NAME                         LEGACY(rem)  PACKAGE(rem)  used  total  start        carried')
console.log('-'.repeat(96))
for (const m of ms) {
  const legacyRem = Math.max(0, m.sessionsTotal - m.sessionsUsed)
  const pkg = m.packages.find(x => x.endDate === null)
  if (!pkg) { console.log(`${(m.firstName+' '+m.lastName).trim().padEnd(28)} ${String(legacyRem).padStart(11)}  (no package)`); continue }
  withPkg++
  const start = pkg.startDate.getTime()
  const end = pkg.endDate ? pkg.endDate.getTime() : Infinity
  const inWin = m.attendance.filter(a => { const t = a.session.date.getTime(); return t >= start && t < end }).length
  const used = pkg.carriedUsed + inWin
  const pkgRem = Math.max(0, pkg.sessionsTotal - used)
  const flag = pkgRem !== legacyRem ? '  <== MISMATCH' : ''
  if (pkgRem !== legacyRem) mismatch++
  console.log(
    `${(m.firstName+' '+m.lastName).trim().padEnd(28)} ${String(legacyRem).padStart(11)}  ${String(pkgRem).padStart(12)}  ${String(used).padStart(4)}  ${String(pkg.sessionsTotal).padStart(5)}  ${pkg.startDate.toISOString().slice(0,10)}  ${String(pkg.carriedUsed).padStart(7)}${flag}`
  )
}
console.log(`\n${withPkg}/${ms.length} members have an active package. ${mismatch} mismatch(es) vs the legacy number.`)
await p.$disconnect()
process.exit(mismatch === 0 ? 0 : 1)
