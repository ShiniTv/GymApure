import fs from 'fs';
import type { Express } from 'express';
import { VIDEO_MAX_UPLOAD_BYTES } from './videoConfig.ts';

const VIDEO_MIMES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PROOF_MIMES = new Set([...IMAGE_MIMES, 'application/pdf']);

function readHead(file: Express.Multer.File, bytes = 16): Buffer {
  if (file.buffer?.length) {
    return file.buffer.subarray(0, Math.min(file.buffer.length, bytes));
  }
  if (file.path) {
    const fd = fs.openSync(file.path, 'r');
    try {
      const buf = Buffer.alloc(bytes);
      fs.readSync(fd, buf, 0, bytes, 0);
      return buf;
    } finally {
      fs.closeSync(fd);
    }
  }
  return Buffer.alloc(0);
}

function startsWith(buf: Buffer, prefix: number[] | string): boolean {
  const needle = typeof prefix === 'string' ? Buffer.from(prefix) : Buffer.from(prefix);
  return buf.length >= needle.length && buf.subarray(0, needle.length).equals(needle);
}

export function matchesFileMagic(mime: string, head: Buffer): boolean {
  if (mime === 'image/jpeg') {
    return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  }
  if (mime === 'image/png') {
    return startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (mime === 'image/webp') {
    return startsWith(head, 'RIFF') && head.length >= 12 && head.subarray(8, 12).toString() === 'WEBP';
  }
  if (mime === 'application/pdf') {
    return startsWith(head, '%PDF');
  }
  if (mime === 'video/webm') {
    return startsWith(head, [0x1a, 0x45, 0xdf, 0xa3]);
  }
  if (mime === 'video/mp4' || mime === 'video/quicktime') {
    return head.length >= 12 && head.subarray(4, 8).toString() === 'ftyp';
  }
  return false;
}

export function assertAllowedUpload(
  file: Express.Multer.File,
  allowedMimes: Set<string>,
  label: string
): void {
  if (!allowedMimes.has(file.mimetype)) {
    throw new Error(`Tipo de archivo no permitido para ${label}.`);
  }
  const head = readHead(file);
  if (!head.length || !matchesFileMagic(file.mimetype, head)) {
    throw new Error(`El contenido del archivo no coincide con el tipo declarado (${label}).`);
  }
}

export function assertVideoUpload(file: Express.Multer.File): void {
  assertAllowedUpload(file, VIDEO_MIMES, 'video');
  assertVideoUploadSize(file);
}

export function assertVideoUploadSize(file: Express.Multer.File): void {
  if (file.size > VIDEO_MAX_UPLOAD_BYTES) {
    const maxMb = (VIDEO_MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0);
    throw new Error(`El video supera el límite de ${maxMb} MB.`);
  }
}

export function assertImageUpload(file: Express.Multer.File): void {
  assertAllowedUpload(file, IMAGE_MIMES, 'imagen');
}

export function assertProofUpload(file: Express.Multer.File): void {
  assertAllowedUpload(file, PROOF_MIMES, 'comprobante');
}

export function safeExtensionForMime(mime: string, kind: 'proof' | 'video' | 'avatar'): string {
  switch (mime) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'application/pdf':
      return '.pdf';
    case 'video/mp4':
      return '.mp4';
    case 'video/webm':
      return '.webm';
    case 'video/quicktime':
      return '.mov';
    default:
      return kind === 'video' ? '.mp4' : kind === 'proof' ? '.bin' : '.jpg';
  }
}
