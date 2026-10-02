/**
 * Say what actually went wrong with a database call.
 *
 * Every page used to report the same thing — "Database not connected" — for any
 * failure at all. When per-class attendance shipped ahead of its column, that
 * message sent two people looking at connection strings and Vercel environment
 * variables while the real answer was a schema one `ALTER TABLE` away. A
 * message that is wrong is worse than no message: it spends someone's time
 * pointing them away from the fix.
 *
 * So: a line a coach can act on, and a line whoever maintains the site can act
 * on. Client-safe — no prisma import — because the attendance calendar reads
 * this through the API and renders it in the browser.
 */

export type DbFailure = {
  /** What a coach standing in a gym needs to know. */
  message: string
  /** What the person who can fix it needs to do. Null when there is nothing specific to say. */
  hint: string | null
}

const GENERIC: DbFailure = {
  message: 'Could not load this from the database.',
  hint: null,
}

/**
 * Matched on the text Prisma puts in the error rather than its error codes, so
 * this keeps working when the failure arrives second-hand — serialized through
 * an API response, where the code has been flattened into a string.
 */
export function describeDbError(err: unknown): DbFailure {
  const text = typeof err === 'string' ? err : err instanceof Error ? err.message : String(err ?? '')

  // The one that caused the outage: code deployed, schema did not follow.
  if (/does not exist in the current database|Unknown argument|P2022/i.test(text)) {
    const column = text.match(/column `([^`]+)`/i)?.[1]
    return {
      message: 'The site has been updated but the database has not caught up yet.',
      hint: `The database is missing a schema change${column ? ` (${column})` : ''}. Apply the pending change to it — the next deploy will print the exact SQL — then reload.`,
    }
  }

  // Genuinely cannot reach the server.
  if (/Can't reach database server|ECONNREFUSED|ETIMEDOUT|P1001|P1002/i.test(text)) {
    return {
      message: 'Cannot reach the database right now.',
      hint: 'Check the database is awake and that DATABASE_URL is set correctly.',
    }
  }

  if (/Environment variable not found|P1012/i.test(text)) {
    return {
      message: 'The site is not configured to reach a database.',
      hint: 'Set DATABASE_URL and DIRECT_URL in the Vercel project settings, then redeploy.',
    }
  }

  if (/Authentication failed|P1000/i.test(text)) {
    return {
      message: 'The database refused the login.',
      hint: 'The password in DATABASE_URL is wrong or has been rotated.',
    }
  }

  return GENERIC
}
