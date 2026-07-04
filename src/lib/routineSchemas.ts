import { z } from 'zod';

export const ROUTINE_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const;

export const routineCreateSchema = z.object({
  name: z.string().trim().min(1, 'Nombre requerido').max(100),
  difficulty: z.enum(ROUTINE_DIFFICULTIES, { message: 'Dificultad inválida' }),
  trainer_id: z.coerce.number().int().positive().optional(),
});

export const routineUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Nombre requerido').max(100),
  difficulty: z.enum(ROUTINE_DIFFICULTIES, { message: 'Dificultad inválida' }),
});

export const routineExerciseSchema = z.object({
  exercise_id: z.coerce.number().int().positive(),
  sets: z.coerce.number().int().positive().max(50),
  reps: z.coerce.number().int().positive().max(500),
  rest_seconds: z.coerce.number().int().min(0).max(600).optional().nullable(),
  weight_suggestion: z
    .preprocess((val) => {
      if (val === null || val === undefined || val === '') return null;
      if (typeof val === 'string') return val.trim();
      if (typeof val === 'number' || typeof val === 'boolean') return String(val);
      return null;
    }, z.string().max(200).nullable())
    .optional(),
});
