import { Router } from 'express';
import { query } from '../db/index.ts';
import { authorize } from './middleware/auth.ts';
import { videoApiPath, videoUpload } from '../lib/uploadStorage.ts';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM exercises ORDER BY name');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authorize(['admin', 'trainer']), videoUpload.single('video'), async (req, res) => {
  const { name, muscle_group, description, execution, video_url } = req.body;
  const videoPath = req.file ? videoApiPath(req.file.filename) : video_url;

  try {
    const { rows } = await query(
      `INSERT INTO exercises (name, muscle_group, description, execution, video_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [name, muscle_group, description, execution, videoPath]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authorize(['admin', 'trainer']), videoUpload.single('video'), async (req, res) => {
  const { id } = req.params;
  const { name, muscle_group, description, execution, video_url } = req.body;
  const videoPath = req.file ? videoApiPath(req.file.filename) : video_url;

  try {
    await query(
      `UPDATE exercises
       SET name = $1, muscle_group = $2, description = $3, execution = $4, video_url = $5
       WHERE id = $6`,
      [name, muscle_group, description, execution, videoPath, id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authorize(['admin', 'trainer']), async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM routine_exercises WHERE exercise_id = $1',
      [id]
    );

    if (parseInt(rows[0].count, 10) > 0) {
      return res.status(400).json({
        error: 'This exercise is used in one or more routines and cannot be deleted.',
      });
    }

    await query('DELETE FROM exercises WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
