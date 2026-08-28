import { describe, expect, it } from 'vitest';
import { isSupabaseTransactionPooler, resolvePgPoolMax } from '../../src/lib/dbPoolConfig.ts';

describe('resolvePgPoolMax', () => {
  it('uses a smaller pool for Supabase transaction pooler (6543)', () => {
    expect(
      resolvePgPoolMax('postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres')
    ).toBe(10);
  });

  it('respects PG_POOL_MAX when valid', () => {
    const prev = process.env.PG_POOL_MAX;
    process.env.PG_POOL_MAX = '7';
    expect(resolvePgPoolMax('postgresql://localhost:5432/app')).toBe(7);
    process.env.PG_POOL_MAX = prev;
  });

  it('detects Supabase transaction pooler URLs', () => {
    expect(
      isSupabaseTransactionPooler('postgresql://user:pass@pooler.supabase.com:6543/postgres')
    ).toBe(true);
    expect(isSupabaseTransactionPooler('postgresql://user:pass@pooler.supabase.com:5432/postgres')).toBe(
      false
    );
  });
});
