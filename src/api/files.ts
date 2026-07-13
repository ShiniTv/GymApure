import type { Response } from 'express';
import { asyncRouter } from './middleware/asyncRouter.ts';
import { query } from '../db/index.ts';
import { AuthRequest } from './middleware/auth.ts';
import { streamPaymentProof } from '../lib/proofStorage.ts';
import {
  streamMediaFile,
  parseStorageMediaRef,
  isMediaStorageRemote,
} from '../lib/mediaStorage.ts';
import { createSignedExerciseMediaUrl } from '../lib/exerciseVideoStorage.ts';
import {
  resolveFilePath,
  proofStoredPaths,
  avatarStoredPaths,
  videoStoredPaths,
} from '../lib/uploadStorage.ts';
import { trainerHasMemberAccess } from '../lib/trainerAccess.ts';

const router = asyncRouter();

async function canAccessMemberProfile(req: AuthRequest, ownerId: number): Promise<boolean> {
  if (req.user!.id === ownerId) return true;
  if (req.user!.role === 'admin' || req.user!.role === 'receptionist') return true;
  if (req.user!.role === 'trainer') {
    return trainerHasMemberAccess(req.user!.id, ownerId);
  }
  return false;
}

/** Payment proof — admin, reception staff, or owning member only. */
router.get('/proofs/:filename', async (req: AuthRequest, res) => {
  const filename = req.params.filename;
  const paths = proofStoredPaths(filename);

  try {
    const { rows } = await query<{ user_id: number; proof_url: string | null }>(
      `SELECT user_id, proof_url FROM payments
       WHERE proof_url = ANY($1::text[])`,
      [paths]
    );

    if (!rows[0]?.proof_url) return res.status(404).json({ error: 'Comprobante no encontrado' });

    const ownerId = Number(rows[0].user_id);
    const canView =
      req.user!.role === 'admin' || req.user!.role === 'receptionist' || req.user!.id === ownerId;
    if (!canView) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    await streamPaymentProof(rows[0].proof_url, res);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

async function authorizeAvatarAccess(
  req: AuthRequest,
  res: Response,
  profileImage: string
): Promise<boolean> {
  const { rows } = await query<{ id: number }>(
    `SELECT id FROM users WHERE profile_image = $1 LIMIT 1`,
    [profileImage]
  );

  const ownerId = rows[0]?.id;
  if (!ownerId) {
    res.status(404).json({ error: 'Avatar no encontrado' });
    return false;
  }

  const allowed = await canAccessMemberProfile(req, Number(ownerId));
  if (!allowed) {
    res.status(403).json({ error: 'Permisos insuficientes' });
    return false;
  }
  return true;
}

router.get('/media/avatars', async (req: AuthRequest, res) => {
  const key = req.query.key;
  if (!key || typeof key !== 'string' || key.includes('..')) {
    return res.status(400).json({ error: 'Clave inválida' });
  }
  const ref = `sbmedia:avatars:${key}`;
  const allowed = await authorizeAvatarAccess(req, res, ref);
  if (!allowed) return;
  await streamMediaFile(ref, res, req);
});

/** Profile avatar — owner, reception/admin, or assigned trainer. */
router.get('/avatars/:filename', async (req: AuthRequest, res) => {
  const filename = req.params.filename;
  const paths = avatarStoredPaths(filename);

  try {
    const { rows } = await query<{ id: number; profile_image: string | null }>(
      `SELECT id, profile_image FROM users
       WHERE profile_image = ANY($1::text[])`,
      [paths]
    );

    if (!rows[0]?.profile_image) return res.status(404).json({ error: 'Avatar no encontrado' });

    const ownerId = Number(rows[0].id);
    const allowed = await canAccessMemberProfile(req, ownerId);
    if (!allowed) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    if (parseStorageMediaRef(rows[0].profile_image)) {
      await streamMediaFile(rows[0].profile_image, res, req);
      return;
    }

    const filePath = resolveFilePath('avatars', filename);
    if (!filePath) return res.status(404).json({ error: 'Archivo no encontrado' });
    res.sendFile(filePath);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/media/videos', async (req: AuthRequest, res) => {
  const key = req.query.key;
  if (!key || typeof key !== 'string' || key.includes('..')) {
    return res.status(400).json({ error: 'Clave inválida' });
  }
  const ref = `sbmedia:videos:${key}`;
  try {
    const { rows } = await query(
      `SELECT id FROM exercises WHERE video_url = $1 OR video_poster_url = $1`,
      [ref]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Video no encontrado' });

    if (isMediaStorageRemote()) {
      const signed = await createSignedExerciseMediaUrl(ref);
      res.redirect(302, signed.url);
      return;
    }

    await streamMediaFile(ref, res, req);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

/** Short-lived signed URL for exercise video/poster (avoids proxying through app server). */
router.get('/videos/signed-url', async (req: AuthRequest, res) => {
  const ref = req.query.ref;
  if (!ref || typeof ref !== 'string') {
    return res.status(400).json({ error: 'Referencia inválida' });
  }

  try {
    const { rows } = await query(
      `SELECT id FROM exercises WHERE video_url = $1 OR video_poster_url = $1`,
      [ref]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Video no encontrado' });

    if (!isMediaStorageRemote()) {
      return res.json({
        url: ref.startsWith('sbmedia:')
          ? `/api/files/media/videos?key=${encodeURIComponent(ref.slice('sbmedia:videos:'.length))}`
          : ref,
        expiresIn: 0,
      });
    }

    const signed = await createSignedExerciseMediaUrl(ref);
    res.json(signed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

/** Exercise video — any authenticated user (library content). */
router.get('/videos/:filename', async (req: AuthRequest, res) => {
  const filename = req.params.filename;
  const paths = videoStoredPaths(filename);

  try {
    const { rows } = await query<{ video_url: string | null; video_poster_url: string | null }>(
      `SELECT video_url, video_poster_url FROM exercises
       WHERE video_url = ANY($1::text[]) OR video_poster_url = ANY($1::text[])`,
      [paths]
    );

    const storedRef = rows[0]?.video_url ?? rows[0]?.video_poster_url;
    if (!storedRef) return res.status(404).json({ error: 'Video no encontrado' });

    if (parseStorageMediaRef(storedRef)) {
      if (isMediaStorageRemote()) {
        const signed = await createSignedExerciseMediaUrl(storedRef);
        res.redirect(302, signed.url);
        return;
      }
      await streamMediaFile(storedRef, res, req);
      return;
    }

    const filePath = resolveFilePath('videos', filename);
    if (!filePath) return res.status(404).json({ error: 'Archivo no encontrado' });
    res.sendFile(filePath);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/media/equipment', async (req: AuthRequest, res) => {
  const key = req.query.key;
  if (!key || typeof key !== 'string' || key.includes('..')) {
    return res.status(400).json({ error: 'Clave inválida' });
  }
  const ref = `sbmedia:equipment:${key}`;
  try {
    const { rows } = await query(`SELECT id FROM gym_equipment WHERE photo_url = $1`, [ref]);
    if (!rows[0]) return res.status(404).json({ error: 'Foto no encontrada' });
    await streamMediaFile(ref, res, req);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

export default router;
