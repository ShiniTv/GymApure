import multer from 'multer';
import type { Request } from 'express';
import path from 'path';
import fs from 'fs';
import { isSupabaseStorageConfigured } from './supabaseAdmin.ts';
import { safeExtensionForMime } from './uploadValidation.ts';
import { VIDEO_MAX_UPLOAD_BYTES } from './videoConfig.ts';

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
const ALLOWED_VIDEO_MIMES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const ALLOWED_AVATAR_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const ALLOWED_PROOF_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);
const ALLOWED_VIDEO_EXT = new Set(['.mp4', '.webm', '.mov']);
const ALLOWED_AVATAR_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function extensionAllowed(originalname: string, allowed: Set<string>): boolean {
  const ext = path.extname(originalname).toLowerCase();
  if (!ext) return true;
  return allowed.has(ext);
}

function proofFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!ALLOWED_PROOF_MIMES.has(file.mimetype)) {
    cb(new Error('Tipo de archivo no permitido. Usa JPG, PNG, WebP o PDF.'));
    return;
  }
  if (!extensionAllowed(file.originalname, ALLOWED_PROOF_EXT)) {
    cb(new Error('Extensión de archivo no permitida.'));
    return;
  }
  cb(null, true);
}

function videoFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!ALLOWED_VIDEO_MIMES.has(file.mimetype)) {
    cb(new Error('Tipo de archivo no permitido. Usa MP4, WebM o MOV.'));
    return;
  }
  if (!extensionAllowed(file.originalname, ALLOWED_VIDEO_EXT)) {
    cb(new Error('Extensión de video no permitida.'));
    return;
  }
  cb(null, true);
}

function avatarFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!ALLOWED_AVATAR_MIMES.has(file.mimetype)) {
    cb(new Error('Tipo de archivo no permitido. Usa JPG, PNG o WebP.'));
    return;
  }
  if (!extensionAllowed(file.originalname, ALLOWED_AVATAR_EXT)) {
    cb(new Error('Extensión de imagen no permitida.'));
    return;
  }
  cb(null, true);
}

function safeDiskFilename(file: Express.Multer.File, kind: 'proof' | 'video' | 'avatar'): string {
  const ext = safeExtensionForMime(file.mimetype, kind);
  return `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
}

export const proofUpload = multer({
  storage: isSupabaseStorageConfigured()
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, PROOFS_DIR),
        filename: (_req, file, cb) => cb(null, safeDiskFilename(file, 'proof')),
      }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: proofFilter,
});

export const videoUpload = multer({
  storage: isSupabaseStorageConfigured()
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, VIDEOS_DIR),
        filename: (_req, file, cb) => cb(null, safeDiskFilename(file, 'video')),
      }),
  limits: { fileSize: VIDEO_MAX_UPLOAD_BYTES },
  fileFilter: videoFilter,
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

export const avatarUpload = multer({
  storage: multer.memoryStorage(),
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

  const dir = kind === 'proofs' ? PROOFS_DIR : kind === 'videos' ? VIDEOS_DIR : AVATARS_DIR;
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

/** Canonical API paths for exact DB lookups (no LIKE). */
export function proofStoredPaths(filename: string): string[] {
  return [`/api/files/proofs/${filename}`, `/uploads/${filename}`];
}

export function avatarStoredPaths(filename: string): string[] {
  return [`/api/files/avatars/${filename}`, `/uploads/avatars/${filename}`];
}

export function videoStoredPaths(filename: string): string[] {
  return [`/api/files/videos/${filename}`, `/uploads/${filename}`];
}
