import fs from 'fs';
import path from 'path';
import type { Express } from 'express';
import {
  isSupabaseStorageConfigured,
  STORAGE_MEDIA_PREFIX,
  supabaseStorageUpload,
  supabaseStorageStream,
  supabaseStorageRemove,
} from '../supabaseAdmin.ts';
import { assertImageUpload } from '../uploadValidation.ts';
import { optimizeAvatar } from '../imageOptimizer.ts';

export const CHAT_ATTACHMENTS_BUCKET = 'chat-attachments';
const CHAT_UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'chat');

if (!fs.existsSync(CHAT_UPLOADS_DIR)) {
  fs.mkdirSync(CHAT_UPLOADS_DIR, { recursive: true });
}

export interface ChatAttachmentMeta {
  url: string;
  mime: string;
  name: string;
}

function isSafeSegment(value: string): boolean {
  return Boolean(value) && !value.includes('..') && !value.includes('/') && !value.includes('\\');
}

export function buildChatAttachmentRef(conversationId: number, objectKey: string): string {
  return `${STORAGE_MEDIA_PREFIX}chat:${conversationId}/${objectKey}`;
}

export function parseChatAttachmentRef(
  storedUrl: string
): { conversationId: number; objectKey: string } | null {
  const prefix = `${STORAGE_MEDIA_PREFIX}chat:`;
  if (!storedUrl.startsWith(prefix)) return null;
  const rest = storedUrl.slice(prefix.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  const conversationId = Number(rest.slice(0, slash));
  const objectKey = rest.slice(slash + 1);
  if (!Number.isFinite(conversationId) || !isSafeSegment(objectKey)) return null;
  return { conversationId, objectKey };
}

export function localChatAttachmentPath(conversationId: number, filename: string): string | null {
  if (!isSafeSegment(filename)) return null;
  const dir = path.join(CHAT_UPLOADS_DIR, String(conversationId));
  const full = path.join(dir, filename);
  if (!full.startsWith(dir)) return null;
  return full;
}

export function chatAttachmentApiPath(conversationId: number, filename: string): string {
  return `/api/chat/conversations/${conversationId}/attachments/${encodeURIComponent(filename)}`;
}

export async function storeChatAttachment(
  conversationId: number,
  file: Express.Multer.File
): Promise<ChatAttachmentMeta> {
  assertImageUpload(file);

  let body = file.buffer ?? (file.path ? fs.readFileSync(file.path) : null);
  if (!body) throw new Error('No se pudo leer el archivo');

  let mime = file.mimetype;
  try {
    const optimized = await optimizeAvatar(body);
    body = optimized.buffer;
    mime = optimized.mime;
  } catch {
    /* keep original */
  }

  const originalName = (file.originalname || 'imagen').slice(0, 120);
  const objectKey = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

  if (isSupabaseStorageConfigured()) {
    await supabaseStorageUpload(
      CHAT_ATTACHMENTS_BUCKET,
      `${conversationId}/${objectKey}`,
      body,
      mime
    );
    if (file.path) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        /* ignore */
      }
    }
    return {
      url: buildChatAttachmentRef(conversationId, objectKey),
      mime,
      name: originalName,
    };
  }

  const dir = path.join(CHAT_UPLOADS_DIR, String(conversationId));
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, objectKey);
  fs.writeFileSync(dest, body);
  if (file.path) {
    try {
      fs.unlinkSync(file.path);
    } catch {
      /* ignore */
    }
  }

  return {
    url: chatAttachmentApiPath(conversationId, objectKey),
    mime,
    name: originalName,
  };
}

export async function streamChatAttachment(
  storedUrl: string,
  conversationId: number,
  res: import('express').Response
): Promise<void> {
  const remote = parseChatAttachmentRef(storedUrl);
  if (remote) {
    if (remote.conversationId !== conversationId) {
      throw Object.assign(new Error('Adjunto no válido'), { status: 400 });
    }
    const streamed = await supabaseStorageStream(
      CHAT_ATTACHMENTS_BUCKET,
      `${remote.conversationId}/${remote.objectKey}`
    );
    res.status(streamed.status);
    if (streamed.contentType) res.setHeader('Content-Type', streamed.contentType);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    if (streamed.contentLength) res.setHeader('Content-Length', streamed.contentLength);
    res.end(streamed.body);
    return;
  }

  const prefix = `/api/chat/conversations/${conversationId}/attachments/`;
  if (!storedUrl.startsWith(prefix)) {
    throw Object.assign(new Error('Adjunto no encontrado'), { status: 404 });
  }
  const filename = decodeURIComponent(storedUrl.slice(prefix.length));
  const localPath = localChatAttachmentPath(conversationId, filename);
  if (!localPath || !fs.existsSync(localPath)) {
    throw Object.assign(new Error('Adjunto no encontrado'), { status: 404 });
  }
  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Cache-Control', 'private, max-age=86400');
  fs.createReadStream(localPath).pipe(res);
}

export async function deleteChatAttachment(storedUrl: string): Promise<void> {
  const remote = parseChatAttachmentRef(storedUrl);
  if (remote) {
    await supabaseStorageRemove(
      CHAT_ATTACHMENTS_BUCKET,
      `${remote.conversationId}/${remote.objectKey}`
    );
    return;
  }
  const match = /\/api\/chat\/conversations\/(\d+)\/attachments\/([^/?#]+)/.exec(storedUrl);
  if (!match) return;
  const conversationId = Number(match[1]);
  const filename = decodeURIComponent(match[2]);
  const localPath = localChatAttachmentPath(conversationId, filename);
  if (localPath && fs.existsSync(localPath)) {
    try {
      fs.unlinkSync(localPath);
    } catch {
      /* ignore */
    }
  }
}
