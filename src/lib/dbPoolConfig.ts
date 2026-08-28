/**
 * Pool sizing for Supabase / Render. Transaction pooler (6543) multiplexes connections;
 * opening too many clients against it causes queueing and "Database pool waiting" spikes.
 */
export function resolvePgPoolMax(databaseUrl: string): number {
  const envMax = parseInt(process.env.PG_POOL_MAX ?? '', 10);
  if (Number.isFinite(envMax) && envMax >= 1 && envMax <= 50) {
    return envMax;
  }

  try {
    const url = new URL(databaseUrl);
    const port = url.port || '5432';

    // Supabase transaction pooler — keep a small client-side pool.
    if (port === '6543') {
      return 10;
    }

    // Supabase session pooler.
    if (port === '5432' && url.hostname.includes('pooler.supabase.com')) {
      return 12;
    }
  } catch {
    /* fall through */
  }

  return process.env.CI === 'true' ? 15 : 20;
}

export function isSupabaseTransactionPooler(databaseUrl: string): boolean {
  try {
    const url = new URL(databaseUrl);
    return (url.port || '5432') === '6543';
  } catch {
    return false;
  }
}
