import multer from 'multer';
import type { Request } from 'express';
import path from 'path';
import fs from 'fs';

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');
const PROOFS_DIR = path.join(UPLOADS_ROOT, 'proofs');
const VIDEOS_DIR = path.join(UPLOADS_ROOT, 'videos');

for (const dir of [UPLOADS_ROOT, PROOFS_DIR, VIDEOS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const ALLOWED_PROOF_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

function proofFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (ALLOWED_PROOF_MIMES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Usa JPG, PNG, WebP o PDF.'));
  }
}

export const proofUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PROOFS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.bin';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: proofFilter,
});

export const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, VIDEOS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.mp4';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
});

export function proofApiPath(filename: string): string {
  return `/api/files/proofs/${filename}`;
}

export function videoApiPath(filename: string): string {
  return `/api/files/videos/${filename}`;
}

export function resolveFilePath(kind: 'proofs' | 'videos', filename: string): string | null {
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return null;
  }

  const primary = path.join(kind === 'proofs' ? PROOFS_DIR : VIDEOS_DIR, filename);
  if (fs.existsSync(primary)) return primary;

  const legacy = path.join(UPLOADS_ROOT, filename);
  if (fs.existsSync(legacy)) return legacy;

  return null;
}

export function extractFilename(storedUrl: string | null | undefined): string | null {
  if (!storedUrl) return null;
  if (storedUrl.startsWith('/api/files/proofs/')) {
    return storedUrl.replace('/api/files/proofs/', '');
  }
  if (storedUrl.startsWith('/api/files/videos/')) {
    return storedUrl.replace('/api/files/videos/', '');
  }
  if (storedUrl.startsWith('/uploads/')) {
    return storedUrl.replace('/uploads/', '');
  }
  return null;
}
