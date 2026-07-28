// One-off cleanup: the Student & Packages import used to create a Payment row
// per student from the "Amount Paid" column, double-counting revenue that the
// Revenue CSV already covers. This deletes those rows.
//
//   node scripts/remove-package-sheet-payments.mjs          # dry run
//   node scripts/remove-package-sheet-payments.mjs --apply  # actually delete

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')

const where = { notes: { startsWith: 'Imported from packages sheet' } }

const rows = await prisma.payment.findMany({ where, include: { member: true } })
const total = rows.reduce((s, p) => s + Number(p.amount), 0)

console.log(`${rows.length} package-sheet payments, $${total.toLocaleString()} total`)
for (const p of rows) {
  console.log(`  ${p.member.firstName} ${p.member.lastName} — $${Number(p.amount)}`)
}

if (apply) {
  const { count } = await prisma.payment.deleteMany({ where })
  console.log(`\nDeleted ${count} payments.`)
} else {
  console.log('\nDry run — re-run with --apply to delete.')
}

await prisma.$disconnect()
