import { useQuery } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import { deriveSetPrescription, parseSetPrescriptionFromApi } from '../../lib/setPrescription';
import { cacheWorkoutRoutine, readCachedWorkoutRoutine } from '../../lib/workoutOfflineQueue';

export interface WorkoutExercise {
  id: number;
  name: string;
  muscle_group: string;
  description?: string;
  execution?: string;
  video_url: string;
  video_poster_url?: string | null;
  sets: number;
  reps: number;
  rest_seconds: number;
  weight_suggestion: string;
  set_prescription?: import('../../lib/setPrescription').SetPrescriptionRow[] | null;
}

export interface WorkoutRoutine {
  id: number;
  name: string;
  difficulty: string;
  exercises: WorkoutExercise[];
}

function normalizeRoutine(data: WorkoutRoutine): WorkoutRoutine {
  const exercises = (Array.isArray(data.exercises) ? data.exercises : []).map((exercise) => ({
    ...exercise,
    set_prescription:
      parseSetPrescriptionFromApi(exercise.set_prescription) ??
      deriveSetPrescription(exercise.sets, exercise.reps),
  }));
  return { ...data, exercises };
}

async function fetchWorkoutRoutine(routineId: string): Promise<WorkoutRoutine> {
  const res = await apiFetch(`/api/routines/${routineId}`);
  const data = await parseJsonResponse<WorkoutRoutine>(res);
  const normalized = normalizeRoutine(data);
  cacheWorkoutRoutine(routineId, normalized);
  return normalized;
}

export function useWorkoutRoutineQuery(routineId: string | undefined) {
  return useQuery({
    queryKey: ['workout-routine', routineId],
    queryFn: async () => {
      if (!routineId) {
        throw new Error('routineId requerido');
      }
      return fetchWorkoutRoutine(routineId);
    },
    enabled: Boolean(routineId),
    staleTime: 30_000,
    placeholderData: () => {
      if (!routineId) return undefined;
      const cached = readCachedWorkoutRoutine(routineId);
      return cached ? normalizeRoutine(cached as WorkoutRoutine) : undefined;
    },
  });
}

export interface WorkoutExerciseOption {
  id: number;
  name: string;
  muscle_group: string;
}

export { useExercisesCatalogQuery as useWorkoutExerciseOptionsQuery } from './useExercisesQuery';
