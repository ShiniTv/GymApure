import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import type { TrainerLevel, TrainingShift } from '../../lib/trainingShift';

export interface Trainer {
  id: number;
  full_name: string;
  email: string;
  cedula: string | null;
  status: string;
  profile_image: string | null;
  level: TrainerLevel;
  specialty: string | null;
  shift: TrainingShift;
  bio: string | null;
}

export interface TrainersQueryParams {
  shift?: TrainingShift | '';
  level?: TrainerLevel | '';
  search?: string;
}

export function trainersQueryKey(params: TrainersQueryParams = {}) {
  return ['trainers', params] as const;
}

async function fetchTrainers(params: TrainersQueryParams): Promise<Trainer[]> {
  const qs = new URLSearchParams();
  if (params.shift) qs.set('shift', params.shift);
  if (params.level) qs.set('level', params.level);
  if (params.search) qs.set('q', params.search);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await apiFetch(`/api/trainers${suffix}`);
  const data = await parseJsonResponse<Trainer[]>(res);
  return Array.isArray(data) ? data : [];
}

export function useTrainersQuery(params: TrainersQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: trainersQueryKey(params),
    queryFn: () => fetchTrainers(params),
    enabled,
  });
}

export function useTrainerMeQuery(enabled = true) {
  return useQuery({
    queryKey: ['trainers', 'me'],
    queryFn: async () => {
      const res = await apiFetch('/api/trainers/me');
      return parseJsonResponse<Trainer>(res);
    },
    enabled,
  });
}

export function useInvalidateTrainers() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['trainers'] });
}
