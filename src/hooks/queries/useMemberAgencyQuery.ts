import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';

export interface RoutineTemplate {
  id: number;
  name: string;
  difficulty: string;
  trainer_id: number;
  trainer_name: string;
  exercise_count: number;
  exercise_preview: string | null;
  already_started?: boolean;
}

export interface MemberActivityChoice {
  id: number;
  member_id: number;
  trainer_id: number;
  event_type: string;
  routine_id: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  member_name?: string;
}

const templatesKey = ['routines', 'templates'] as const;

export function useRoutineTemplatesQuery(enabled = true) {
  return useQuery({
    queryKey: templatesKey,
    queryFn: async () => {
      const res = await apiFetch('/api/routines/templates');
      const data = await parseJsonResponse<RoutineTemplate[]>(res);
      return Array.isArray(data) ? data : [];
    },
    enabled,
  });
}

export function useSelfAssignTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: number) => {
      const res = await apiFetch(`/api/routines/${templateId}/self-assign`, { method: 'POST' });
      return parseJsonResponse<{ routine_id: number; routine_name: string }>(res);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['routines'] });
      void qc.invalidateQueries({ queryKey: ['member-stats'] });
      void qc.invalidateQueries({ queryKey: templatesKey });
    },
  });
}

export function useSetTodayRoutineMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (routineId: number) => {
      const res = await apiFetch('/api/stats/member/today-routine', {
        method: 'PUT',
        body: JSON.stringify({ routine_id: routineId }),
      });
      return parseJsonResponse<{ success: boolean }>(res);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['member-stats'] });
    },
  });
}

export function useSubstituteRoutineExerciseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      routineId: number;
      routineExerciseId: number;
      exercise_id: number;
      reason: string;
    }) => {
      const res = await apiFetch(
        `/api/routines/${input.routineId}/exercises/${input.routineExerciseId}/substitute`,
        {
          method: 'POST',
          body: JSON.stringify({
            exercise_id: input.exercise_id,
            reason: input.reason,
          }),
        }
      );
      return parseJsonResponse(res);
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['routines'] });
      void qc.invalidateQueries({ queryKey: ['workout-routine', String(variables.routineId)] });
      void qc.invalidateQueries({ queryKey: ['member-stats'] });
    },
  });
}
