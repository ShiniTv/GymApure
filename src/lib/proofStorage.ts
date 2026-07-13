import type { Response } from 'express';
import path from 'path';
import fs from 'fs';
import {
  isSupabaseStorageConfigured,
  PAYMENT_PROOFS_BUCKET,
  STORAGE_PROOF_PREFIX,
  supabaseStorageDownload,
  supabaseStorageUpload,
} from './supabaseAdmin.ts';
import { optimizeProof } from './imageOptimizer.ts';
import { proofApiPath, resolveFilePath } from './uploadStorage.ts';

export function isProofStorageRemote(): boolean {
  return isSupabaseStorageConfigured();
}

export function buildStorageProofRef(objectKey: string): string {
  return `${STORAGE_PROOF_PREFIX}${objectKey}`;
}

export function parseStorageProofRef(proofUrl: string): string | null {
  if (!proofUrl.startsWith(STORAGE_PROOF_PREFIX)) return null;
  const key = proofUrl.slice(STORAGE_PROOF_PREFIX.length);
  if (!key || key.includes('..')) return null;
  return key;
}

function extensionFromMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'application/pdf':
      return '.pdf';
    default:
      return '.bin';
  }
}

async function prepareProofPayload(
  file: Express.Multer.File
): Promise<{ body: Buffer; mime: string; ext: string }> {
  const body = file.buffer ?? (file.path ? fs.readFileSync(file.path) : null);
  if (!body) {
    throw new Error('No se pudo leer el comprobante subido');
  }

  if (file.mimetype.startsWith('image/')) {
    const optimized = await optimizeProof(body);
    return {
      body: optimized.buffer,
      mime: optimized.mime,
      ext: optimized.mime === 'image/webp' ? '.webp' : '.jpg',
    };
  }

  const ext = path.extname(file.originalname) || extensionFromMime(file.mimetype);
  return { body, mime: file.mimetype, ext };
}

export async function uploadPaymentProof(
  file: Express.Multer.File,
  userId: number,
  paymentId: number
): Promise<string> {
  const { body, mime, ext } = await prepareProofPayload(file);
  const objectKey = `${userId}/${paymentId}-${Date.now()}${ext}`;

  try {
    await supabaseStorageUpload(PAYMENT_PROOFS_BUCKET, objectKey, body, mime);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    if (/invalid compact jws|invalid jwt/i.test(message)) {
      throw new Error(
        'Error al subir comprobante: clave de Supabase inválida. En .env usa la service_role (JWT eyJ…) o sb_secret_… del dashboard (API Keys), sin comillas ni espacios. Si estás en local, puedes quitar SUPABASE_SERVICE_ROLE_KEY para guardar en disco.'
      );
    }
    throw new Error(`Error al subir comprobante: ${message}`);
  }

  if (file.path) {
    try {
      fs.unlinkSync(file.path);
    } catch {
      /* ignore cleanup errors */
    }
  }

  return buildStorageProofRef(objectKey);
}

export async function streamPaymentProof(proofUrl: string, res: Response): Promise<void> {
  const storageKey = parseStorageProofRef(proofUrl);
  if (storageKey) {
    try {
      const buffer = await supabaseStorageDownload(PAYMENT_PROOFS_BUCKET, storageKey);
      const ext = path.extname(storageKey).toLowerCase();
      const contentType =
        ext === '.pdf'
          ? 'application/pdf'
          : ext === '.png'
            ? 'image/png'
            : ext === '.webp'
              ? 'image/webp'
              : 'image/jpeg';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(buffer);
    } catch {
      res.status(404).json({ error: 'Comprobante no encontrado en Storage' });
    }
    return;
  }

  const localSegment = proofUrl.replace('/api/files/proofs/', '');
  const filePath = resolveFilePath('proofs', localSegment);
  if (!filePath) {
    res.status(404).json({ error: 'Comprobante no encontrado' });
    return;
  }

  res.sendFile(filePath);
}

export function localProofPathFromUpload(file: Express.Multer.File): string {
  return proofApiPath(file.filename);
}

/** Optimizes image proofs on disk and returns the canonical API path. */
export async function finalizeLocalProof(file: Express.Multer.File): Promise<string> {
  if (!file.path || !file.mimetype.startsWith('image/')) {
    return localProofPathFromUpload(file);
  }

  const { body, ext } = await prepareProofPayload(file);
  const parsed = path.parse(file.path);
  const optimizedPath = path.join(parsed.dir, `${parsed.name}${ext}`);

  fs.writeFileSync(optimizedPath, body);
  if (optimizedPath !== file.path) {
    try {
      fs.unlinkSync(file.path);
    } catch {
      /* ignore cleanup errors */
    }
  }

  return proofApiPath(path.basename(optimizedPath));
}
