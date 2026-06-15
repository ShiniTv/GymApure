import type { Response } from 'express';
import path from 'path';
import fs from 'fs';
import {
  getSupabaseAdmin,
  isSupabaseStorageConfigured,
  PAYMENT_PROOFS_BUCKET,
  STORAGE_PROOF_PREFIX,
} from './supabaseAdmin.ts';
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

export async function uploadPaymentProof(
  file: Express.Multer.File,
  userId: number,
  paymentId: number
): Promise<string> {
  const ext = path.extname(file.originalname) || extensionFromMime(file.mimetype);
  const objectKey = `${userId}/${paymentId}-${Date.now()}${ext}`;

  const supabase = getSupabaseAdmin();
  const body = file.buffer ?? (file.path ? fs.readFileSync(file.path) : null);
  if (!body) {
    throw new Error('No se pudo leer el comprobante subido');
  }

  const { error } = await supabase.storage.from(PAYMENT_PROOFS_BUCKET).upload(objectKey, body, {
    contentType: file.mimetype,
    upsert: false,
  });

  if (error) {
    throw new Error(`Error al subir comprobante: ${error.message}`);
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
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from(PAYMENT_PROOFS_BUCKET).download(storageKey);

    if (error || !data) {
      res.status(404).json({ error: 'Comprobante no encontrado en Storage' });
      return;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
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
