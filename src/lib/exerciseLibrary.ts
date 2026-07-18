import { query } from '../db/index.ts';
import { deleteExerciseMedia } from './mediaStorage.ts';
import { LIKE_ESCAPE_CLAUSE, toLikeContainsPattern } from './sqlLike.ts';

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

export interface ExerciseListOptions {
  role: string;
  trainerId: number | null;
  muscleGroup?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

function buildLibraryBase(
  role: string,
  trainerId: number | null
): { fromSql: string; params: unknown[]; needsWhereOne: boolean } {
  if (role === 'trainer' && trainerId != null) {
    return {
      fromSql: `
      FROM (
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
      ) AS library`,
      params: [trainerId, trainerId, trainerId],
      needsWhereOne: true,
    };
  }

  if (role === 'member') {
    return {
      fromSql: `FROM exercises AS library
        WHERE owner_trainer_id IS NULL AND forked_from_id IS NULL`,
      params: [],
      needsWhereOne: false,
    };
  }

  return {
    fromSql: 'FROM exercises AS library',
    params: [],
    needsWhereOne: true,
  };
}

function appendFilters(
  params: unknown[],
  needsWhereOne: boolean,
  muscleGroup?: string,
  search?: string
): { whereSql: string; params: unknown[] } {
  const next = [...params];
  const clauses: string[] = [];

  if (muscleGroup) {
    next.push(muscleGroup);
    clauses.push(`muscle_group = $${next.length}`);
  }

  const pattern = search ? toLikeContainsPattern(search) : null;
  if (pattern) {
    next.push(pattern);
    const idx = next.length;
    clauses.push(
      `(LOWER(name) LIKE $${idx}${LIKE_ESCAPE_CLAUSE} OR LOWER(muscle_group) LIKE $${idx}${LIKE_ESCAPE_CLAUSE})`
    );
  }

  if (clauses.length === 0) {
    return {
      whereSql: needsWhereOne ? ' WHERE 1=1' : '',
      params: next,
    };
  }

  if (needsWhereOne) {
    return { whereSql: ` WHERE 1=1 AND ${clauses.join(' AND ')}`, params: next };
  }
  return { whereSql: ` AND ${clauses.join(' AND ')}`, params: next };
}

/** @deprecated Prefer buildExerciseListQueries for pagination. */
export function buildExerciseListQuery(
  role: string,
  trainerId: number | null,
  muscleGroup?: string
): { sql: string; params: unknown[] } {
  const { listSql, listParams } = buildExerciseListQueries({
    role,
    trainerId,
    muscleGroup,
  });
  return { sql: listSql, params: listParams };
}

export function buildExerciseListQueries(options: ExerciseListOptions): {
  countSql: string;
  listSql: string;
  params: unknown[];
  listParams: unknown[];
} {
  const base = buildLibraryBase(options.role, options.trainerId);
  const { whereSql, params } = appendFilters(
    base.params,
    base.needsWhereOne,
    options.muscleGroup,
    options.search
  );

  const countSql = `SELECT COUNT(*)::text AS count ${base.fromSql}${whereSql}`;
  let listSql = `SELECT * ${base.fromSql}${whereSql} ORDER BY name`;

  const listParams = [...params];
  if (options.limit != null) {
    listParams.push(options.limit);
    listSql += ` LIMIT $${listParams.length}`;
  }
  if (options.offset != null) {
    listParams.push(options.offset);
    listSql += ` OFFSET $${listParams.length}`;
  }

  return { countSql, listSql, params, listParams };
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
