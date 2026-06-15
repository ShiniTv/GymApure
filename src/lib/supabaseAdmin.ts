import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.ts';

export const PAYMENT_PROOFS_BUCKET = 'payment-proofs';
export const STORAGE_PROOF_PREFIX = 'sb:';

let client: SupabaseClient | null = null;

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Supabase Storage no configurado. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env'
    );
  }

  if (!client) {
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return client;
}
