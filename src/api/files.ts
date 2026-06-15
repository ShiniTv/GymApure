import { Router } from 'express';
import { query } from '../db/index.ts';
import { AuthRequest } from './middleware/auth.ts';
import { streamPaymentProof } from '../lib/proofStorage.ts';
import { resolveFilePath } from '../lib/uploadStorage.ts';

const router = Router();

/** Payment proof — admin or owning member only (legacy local path). */
router.get('/proofs/:filename', async (req: AuthRequest, res) => {
  const filename = req.params.filename;

  try {
    const { rows } = await query<{ user_id: number; proof_url: string | null }>(
      `SELECT user_id, proof_url FROM payments
       WHERE proof_url = $1 OR proof_url = $2 OR proof_url LIKE $3`,
      [`/api/files/proofs/${filename}`, `/uploads/${filename}`, `%${filename}`]
    );

    if (!rows[0]?.proof_url) return res.status(404).json({ error: 'Comprobante no encontrado' });

    const ownerId = Number(rows[0].user_id);
    if (req.user!.role !== 'admin' && req.user!.id !== ownerId) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    await streamPaymentProof(rows[0].proof_url, res);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

/** Exercise video — any authenticated user. */
router.get('/videos/:filename', async (req: AuthRequest, res) => {
  const filename = req.params.filename;
  const filePath = resolveFilePath('videos', filename);
  if (!filePath) return res.status(404).json({ error: 'Archivo no encontrado' });

  try {
    const { rows } = await query(
      `SELECT id FROM exercises
       WHERE video_url IN ($1, $2) OR video_url LIKE $3`,
      [`/api/files/videos/${filename}`, `/uploads/${filename}`, `%${filename}`]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Video no encontrado' });

    res.sendFile(filePath);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

export default router;
