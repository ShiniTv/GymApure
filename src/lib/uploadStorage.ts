import multer from 'multer';
import type { Request } from 'express';
import path from 'path';
import fs from 'fs';
import { isSupabaseStorageConfigured } from './supabaseAdmin.ts';

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');
const PROOFS_DIR = path.join(UPLOADS_ROOT, 'proofs');
const VIDEOS_DIR = path.join(UPLOADS_ROOT, 'videos');
const AVATARS_DIR = path.join(UPLOADS_ROOT, 'avatars');

for (const dir of [UPLOADS_ROOT, PROOFS_DIR, VIDEOS_DIR, AVATARS_DIR]) {
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
  storage: isSupabaseStorageConfigured()
    ? multer.memoryStorage()
    : multer.diskStorage({
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

export function avatarApiPath(filename: string): string {
  return `/api/files/avatars/${filename}`;
}

const ALLOWED_AVATAR_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function avatarFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (ALLOWED_AVATAR_MIMES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Usa JPG, PNG o WebP.'));
  }
}

export const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: avatarFilter,
});

export function resolveFilePath(
  kind: 'proofs' | 'videos' | 'avatars',
  filename: string
): string | null {
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return null;
  }

  const dir =
    kind === 'proofs' ? PROOFS_DIR : kind === 'videos' ? VIDEOS_DIR : AVATARS_DIR;
  const primary = path.join(dir, filename);
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
  if (storedUrl.startsWith('/api/files/avatars/')) {
    return storedUrl.replace('/api/files/avatars/', '');
  }
  if (storedUrl.startsWith('/uploads/')) {
    return storedUrl.replace('/uploads/', '');
  }
  return null;
}
