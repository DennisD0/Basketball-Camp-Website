/**
 * Stable per-row keys for CSV imports.
 *
 * Re-uploading a spreadsheet must not duplicate rows. Each imported row gets a
 * deterministic key derived from its own content, stored in a unique column, so
 * a second upload of the same file collides and is skipped.
 *
 * The key includes an occurrence index within its own content-group, so a sheet
 * that genuinely lists the same payment twice (same student, date and amount)
 * still imports both — while a re-upload of that sheet still imports neither
 * again. Row ORDER is deliberately not part of the key: re-sorting the sheet
 * should not resurrect every row as new.
 */

function norm(s: unknown): string {
  return String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Assigns `importKey` to each row: `<prefix>:<content>#<n>`, where n counts
 * prior rows in the same upload sharing that content.
 */
export function withImportKeys<T>(
  prefix: string,
  rows: T[],
  parts: (row: T) => unknown[],
): (T & { importKey: string })[] {
  const seen = new Map<string, number>()
  return rows.map(row => {
    const content = parts(row).map(norm).join('|')
    const n = seen.get(content) ?? 0
    seen.set(content, n + 1)
    return { ...row, importKey: `${prefix}:${content}#${n}` }
  })
}
