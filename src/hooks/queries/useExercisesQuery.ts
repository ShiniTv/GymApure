import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';

export interface Exercise {
  id: number;
  name: string;
  muscle_group: string;
  description: string | null;
  execution: string | null;
  video_url: string | null;
}

async function fetchExercises(): Promise<Exercise[]> {
  const res = await apiFetch('/api/exercises');
  const data = await parseJsonResponse<Exercise[]>(res);
  return Array.isArray(data) ? data : [];
}

export function useExercisesQuery(enabled = true) {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: fetchExercises,
    enabled,
  });
}

export function useInvalidateExercises() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['exercises'] });
}
