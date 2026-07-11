/** Escape `%` and `_` wildcards for safe use inside SQL LIKE/ILIKE patterns. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}

export function toLikeContainsPattern(search: string): string {
  const trimmed = search.trim().toLowerCase();
  if (!trimmed) return '';
  return `%${escapeLikePattern(trimmed)}%`;
}

/** Append to LIKE/ILIKE comparisons when using patterns from `toLikeContainsPattern`. */
export const LIKE_ESCAPE_CLAUSE = " ESCAPE E'\\\\'";
