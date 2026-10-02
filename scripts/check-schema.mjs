/**
 * Refuse to build if the database does not match prisma/schema.prisma.
 *
 * This project has no migration history — the schema is managed with
 * `prisma db push`, run by hand. Nothing connected a deploy to the database it
 * would run against, so shipping per-class attendance put code that selects
 * `sessions.class_key` in front of a database with no such column. Build green,
 * deploy green, every attendance page a 500 until somebody ran the push.
 *
 * This closes that gap from the safe side. It only READS the database — it
 * compares the live shape against the schema file and stops the build when they
 * differ, printing the exact SQL to run. Nothing here alters anything: a deploy
 * that would break the site fails loudly instead, and a human decides what to
 * do about it. A red build is a minute of annoyance; the alternative was an
 * outage nobody noticed until a coach tried to take a register.
 */
import { spawnSync } from 'node:child_process'

const onCI = Boolean(process.env.VERCEL || process.env.CI)

if (!process.env.DATABASE_URL) {
  // Building locally with no database configured is a normal thing to do.
  if (!onCI) {
    console.warn('[check-schema] No DATABASE_URL — skipping schema check (local build).')
    process.exit(0)
  }
  console.error(
    '\n[check-schema] DATABASE_URL is not set, so the schema cannot be checked.\n' +
    '[check-schema] Set DATABASE_URL and DIRECT_URL in the project settings, then redeploy.\n',
  )
  process.exit(1)
}

// --exit-code: 0 = database matches, 2 = it does not, 1 = the check itself failed.
const diff = spawnSync(
  'npx',
  ['prisma', 'migrate', 'diff',
   '--from-url', process.env.DIRECT_URL || process.env.DATABASE_URL,
   '--to-schema-datamodel', 'prisma/schema.prisma',
   '--script', '--exit-code'],
  { encoding: 'utf8', env: process.env },
)

if (diff.status === 0) {
  console.log('[check-schema] Database matches the schema.')
  process.exit(0)
}

if (diff.status !== 2) {
  // Could not reach the database, bad credentials, Prisma itself failed. Say so
  // and let the build continue: a check that cannot run is not evidence of a
  // mismatch, and blocking every deploy on a flaky lookup trades one outage for
  // another.
  console.warn('[check-schema] Could not check the schema — continuing.')
  console.warn(diff.stderr?.trim() || '(no detail)')
  process.exit(0)
}

console.error(
  '\n[check-schema] STOPPING THE BUILD: the database does not match prisma/schema.prisma.\n' +
  '[check-schema] Deploying now would put code in front of a database that cannot serve it,\n' +
  '[check-schema] which is exactly how the attendance pages went down.\n\n' +
  '[check-schema] Run this against the production database, then redeploy:\n\n' +
  '--- 8< ---\n' + (diff.stdout?.trim() || '(no SQL produced)') + '\n--- >8 ---\n\n' +
  '[check-schema] Running the SQL is the reliable route. `npm run db:push` does the same job,\n' +
  '[check-schema] but it refuses anything it considers risky — adding a unique constraint, for\n' +
  '[check-schema] instance — and tells you to pass --accept-data-loss. Read what it is warning\n' +
  '[check-schema] about before reaching for that flag; it also silences real deletions.\n',
)
process.exit(1)
