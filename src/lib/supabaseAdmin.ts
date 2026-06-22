import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.ts';

export const PAYMENT_PROOFS_BUCKET = 'payment-proofs';
export const AVATARS_BUCKET = 'avatars';
export const VIDEOS_BUCKET = 'exercise-videos';
export const STORAGE_PROOF_PREFIX = 'sb:';
export const STORAGE_MEDIA_PREFIX = 'sbmedia:';

let client: SupabaseClient | null = null;

/** Strip quotes / Bearer prefix often copied by mistake from the dashboard. */
export function normalizeSupabaseApiKey(key: string): string {
  let normalized = key.trim();
  if (normalized.toLowerCase().startsWith('bearer ')) {
    normalized = normalized.slice(7).trim();
  }
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }
  return normalized;
}

/** Legacy anon / service_role keys are JWTs (eyJ… with 3 segments). */
export function isSupabaseJwtApiKey(key: string): boolean {
  const parts = key.split('.');
  return parts.length === 3 && parts[0].startsWith('eyJ');
}

/** New Supabase secret keys (sb_secret_…) are opaque, not JWTs. */
export function isSupabaseOpaqueSecretKey(key: string): boolean {
  return key.startsWith('sb_secret_');
}

export function getSupabaseServiceKey(): string | undefined {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return undefined;
  return normalizeSupabaseApiKey(env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isSupabaseStorageConfigured(): boolean {
  if (!env.SUPABASE_URL || !getSupabaseServiceKey()) return false;
  const key = getSupabaseServiceKey()!;
  return isSupabaseJwtApiKey(key) || isSupabaseOpaqueSecretKey(key);
}

/** Headers for Storage REST calls. Opaque keys must NOT use Authorization (causes Invalid Compact JWS). */
export function buildSupabaseStorageHeaders(
  key: string,
  extra: Record<string, string> = {}
): Record<string, string> {
  const headers: Record<string, string> = { apikey: key, ...extra };
  if (isSupabaseJwtApiKey(key)) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

export function getSupabaseAdmin(): SupabaseClient {
  const key = getSupabaseServiceKey();
  if (!env.SUPABASE_URL || !key) {
    throw new Error(
      'Supabase Storage no configurado. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env'
    );
  }

  if (!client) {
    client = createClient(env.SUPABASE_URL, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          apikey: key,
        },
      },
    });
  }

  return client;
}

export async function supabaseStorageUpload(
  bucket: string,
  objectKey: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  const baseUrl = env.SUPABASE_URL;
  const key = getSupabaseServiceKey();
  if (!baseUrl || !key) {
    throw new Error('Supabase Storage no configurado');
  }

  const encodedPath = objectKey.split('/').map(encodeURIComponent).join('/');
  const url = `${baseUrl}/storage/v1/object/${bucket}/${encodedPath}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: buildSupabaseStorageHeaders(key, {
      'Content-Type': contentType,
      'x-upsert': 'false',
    }),
    body,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const payload = (await response.json()) as { message?: string; error?: string };
      message = payload.message ?? payload.error ?? message;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new Error(message);
  }
}

export async function supabaseStorageDownload(bucket: string, objectKey: string): Promise<Buffer> {
  const baseUrl = env.SUPABASE_URL;
  const key = getSupabaseServiceKey();
  if (!baseUrl || !key) {
    throw new Error('Supabase Storage no configurado');
  }

  const encodedPath = objectKey.split('/').map(encodeURIComponent).join('/');
  const url = `${baseUrl}/storage/v1/object/${bucket}/${encodedPath}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: buildSupabaseStorageHeaders(key),
  });

  if (!response.ok) {
    throw new Error('Comprobante no encontrado en Storage');
  }

  return Buffer.from(await response.arrayBuffer());
}
