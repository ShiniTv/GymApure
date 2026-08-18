import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import type { PaginatedResult } from '../../lib/pagination';

/** Slim catalog row (`GET /api/exercises`). Detail fields arrive when opening the modal. */
export interface Exercise {
  id: number;
  name: string;
  muscle_group: string;
  has_video?: boolean;
  description?: string | null;
  execution?: string | null;
  video_url?: string | null;
  video_poster_url?: string | null;
  is_system?: boolean;
  owner_trainer_id?: number | null;
  forked_from_id?: number | null;
}

export function exerciseHasVideo(exercise: Pick<Exercise, 'has_video' | 'video_url'>): boolean {
  return Boolean(exercise.has_video || exercise.video_url);
}

export interface ExercisesQueryParams {
  q?: string;
  muscleGroup?: string;
  page?: number;
  pageSize?: number;
}

async function fetchExercisesPage(
  params: ExercisesQueryParams = {}
): Promise<PaginatedResult<Exercise>> {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.muscleGroup) search.set('muscle_group', params.muscleGroup);
  search.set('page', String(params.page ?? 1));
  search.set('pageSize', String(params.pageSize ?? 50));
  const res = await apiFetch(`/api/exercises?${search.toString()}`);
  return parseJsonResponse<PaginatedResult<Exercise>>(res);
}

export const EXERCISES_CATALOG_QUERY_KEY = ['exercises', 'catalog'] as const;

/** Slim catalog for pickers (server-capped). */
export async function fetchExercisesCatalog(): Promise<Exercise[]> {
  const res = await apiFetch('/api/exercises?all=1');
  const data = await parseJsonResponse<Exercise[]>(res);
  return Array.isArray(data) ? data : [];
}

export async function fetchExerciseById(id: number): Promise<Exercise> {
  const res = await apiFetch(`/api/exercises/${id}`);
  return parseJsonResponse<Exercise>(res);
}

export function useExercisesQuery(
  enabledOrParams: boolean | ExercisesQueryParams = true,
  enabled = true
) {
  const params: ExercisesQueryParams = typeof enabledOrParams === 'boolean' ? {} : enabledOrParams;
  const isEnabled = typeof enabledOrParams === 'boolean' ? enabledOrParams : enabled;

  return useQuery({
    queryKey: [
      'exercises',
      'page',
      params.q ?? '',
      params.muscleGroup ?? '',
      params.page ?? 1,
      params.pageSize ?? 50,
    ],
    queryFn: () => fetchExercisesPage(params),
    enabled: isEnabled,
  });
}

export function useExercisesCatalogQuery(enabled = true) {
  return useQuery({
    queryKey: EXERCISES_CATALOG_QUERY_KEY,
    queryFn: fetchExercisesCatalog,
    enabled,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

export function useExerciseDetailQuery(id: number | null) {
  return useQuery({
    queryKey: ['exercises', 'detail', id],
    queryFn: () => fetchExerciseById(id!),
    enabled: id != null,
  });
}

export function useInvalidateExercises() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['exercises'] });
}
