import { query } from '../db/index.ts';
import { deleteExerciseMedia } from './mediaStorage.ts';

export interface ExerciseRow {
  id: number;
  name: string;
  muscle_group: string;
  description: string | null;
  execution: string | null;
  video_url: string | null;
  video_poster_url: string | null;
  is_system: boolean;
  owner_trainer_id: number | null;
  forked_from_id: number | null;
  created_at?: string;
}

export function buildExerciseListQuery(
  role: string,
  trainerId: number | null,
  muscleGroup?: string
): { sql: string; params: unknown[] } {
  const params: unknown[] = [];
  let muscleFilter = '';

  if (muscleGroup) {
    params.push(muscleGroup);
    muscleFilter = ` AND muscle_group = $${params.length}`;
  }

  if (role === 'trainer' && trainerId != null) {
    params.push(trainerId, trainerId, trainerId);
    const sql = `
      SELECT * FROM (
        SELECT e.*
        FROM exercises e
        WHERE e.is_system = true
          AND e.owner_trainer_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM trainer_exercise_hidden h
            WHERE h.trainer_id = $1 AND h.exercise_id = e.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM exercises fork
            WHERE fork.forked_from_id = e.id AND fork.owner_trainer_id = $2
          )
        UNION
        SELECT e.*
        FROM exercises e
        WHERE e.is_system = false
          AND e.owner_trainer_id IS NULL
          AND e.forked_from_id IS NULL
        UNION
        SELECT e.*
        FROM exercises e
        WHERE e.owner_trainer_id = $3
      ) AS library
      WHERE 1=1${muscleFilter}
      ORDER BY name
    `;
    return { sql, params };
  }

  if (role === 'member') {
    const sql = `
      SELECT * FROM exercises
      WHERE owner_trainer_id IS NULL AND forked_from_id IS NULL${muscleFilter}
      ORDER BY name
    `;
    return { sql, params };
  }

  const sql = `SELECT * FROM exercises WHERE 1=1${muscleFilter} ORDER BY name`;
  return { sql, params };
}

export async function getExerciseById(id: number): Promise<ExerciseRow | null> {
  const { rows } = await query<ExerciseRow>('SELECT * FROM exercises WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function getTrainerFork(
  systemExerciseId: number,
  trainerId: number
): Promise<ExerciseRow | null> {
  const { rows } = await query<ExerciseRow>(
    `SELECT * FROM exercises WHERE forked_from_id = $1 AND owner_trainer_id = $2`,
    [systemExerciseId, trainerId]
  );
  return rows[0] ?? null;
}

export async function hideSystemExerciseForTrainer(
  trainerId: number,
  exerciseId: number
): Promise<void> {
  await query(
    `INSERT INTO trainer_exercise_hidden (trainer_id, exercise_id)
     VALUES ($1, $2)
     ON CONFLICT (trainer_id, exercise_id) DO NOTHING`,
    [trainerId, exerciseId]
  );
}

export async function forkSystemExerciseForTrainer(
  systemExercise: ExerciseRow,
  trainerId: number,
  fields: {
    name: string;
    muscle_group: string;
    description: string | null | undefined;
    execution: string | null | undefined;
    video_url: string | null | undefined;
    video_poster_url: string | null | undefined;
  }
): Promise<number> {
  const existingFork = await getTrainerFork(systemExercise.id, trainerId);
  if (existingFork) {
    const mediaChanged =
      fields.video_url !== existingFork.video_url ||
      fields.video_poster_url !== existingFork.video_poster_url;

    await query(
      `UPDATE exercises
       SET name = $1, muscle_group = $2, description = $3, execution = $4,
           video_url = $5, video_poster_url = $6
       WHERE id = $7`,
      [
        fields.name,
        fields.muscle_group,
        fields.description,
        fields.execution,
        fields.video_url,
        fields.video_poster_url,
        existingFork.id,
      ]
    );

    if (mediaChanged) {
      await deleteExerciseMedia(existingFork.video_url, existingFork.video_poster_url);
    }

    return existingFork.id;
  }

  const { rows } = await query<{ id: number }>(
    `INSERT INTO exercises (
       name, muscle_group, description, execution, video_url, video_poster_url,
       is_system, owner_trainer_id, forked_from_id
     )
     VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8)
     RETURNING id`,
    [
      fields.name,
      fields.muscle_group,
      fields.description,
      fields.execution,
      fields.video_url,
      fields.video_poster_url,
      trainerId,
      systemExercise.id,
    ]
  );

  await hideSystemExerciseForTrainer(trainerId, systemExercise.id);
  return rows[0].id;
}

export function isSystemCatalogExercise(exercise: ExerciseRow): boolean {
  return exercise.is_system && exercise.owner_trainer_id == null;
}

export function canTrainerMutateExercise(exercise: ExerciseRow, trainerId: number): boolean {
  if (isSystemCatalogExercise(exercise)) return true;
  if (exercise.owner_trainer_id === trainerId) return true;
  if (!exercise.is_system && exercise.owner_trainer_id == null && exercise.forked_from_id == null) {
    return true;
  }
  return false;
}
