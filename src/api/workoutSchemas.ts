import { z } from 'zod';

export const startWorkoutSchema = z.object({
  user_id: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  routine_id: z.union([z.number(), z.string()]).transform((v) => Number(v)),
});

export const logWorkoutSchema = z.object({
  session_id: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  exercise_id: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  set_number: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  weight: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  reps: z.union([z.number(), z.string()]).transform((v) => Number(v)),
});

export const finishWorkoutSchema = z.object({
  session_id: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  success: z.boolean(),
});

export const cancelWorkoutSchema = z.object({
  session_id: z.union([z.number(), z.string()]).transform((v) => Number(v)),
});
