import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import type { PaginatedResult } from '../../lib/pagination';

export interface CoachNote {
  id: number;
  member_id: number;
  author_id: number;
  author_name: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface MemberWorkoutProgress {
  weekly_goal: number;
  workouts_this_week: number;
  goal_completion_percent: number;
  weeks: {
    week_start: string;
    volume_kg: number;
    max_weight_kg: number;
    workouts: number;
  }[];
}

const coachNotesKey = (memberId: number) => ['coach-notes', memberId] as const;
const memberProgressKey = (memberId: number) => ['member-progress', memberId] as const;

export function useCoachNotesQuery(memberId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: coachNotesKey(memberId ?? 0),
    enabled: enabled && memberId != null && memberId > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await apiFetch(`/api/users/${memberId}/coach-notes?page=1&pageSize=50`);
      return parseJsonResponse<PaginatedResult<CoachNote>>(res);
    },
  });
}

export function useCreateCoachNote(memberId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const res = await apiFetch(`/api/users/${memberId}/coach-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      return parseJsonResponse<CoachNote>(res);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: coachNotesKey(memberId) });
    },
  });
}

export function useUpdateCoachNote(memberId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ noteId, body }: { noteId: number; body: string }) => {
      const res = await apiFetch(`/api/users/${memberId}/coach-notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      return parseJsonResponse<CoachNote>(res);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: coachNotesKey(memberId) });
    },
  });
}

export function useDeleteCoachNote(memberId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: number) => {
      const res = await apiFetch(`/api/users/${memberId}/coach-notes/${noteId}`, {
        method: 'DELETE',
      });
      return parseJsonResponse<{ success: boolean }>(res);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: coachNotesKey(memberId) });
    },
  });
}

export function useMemberProgressQuery(memberId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: memberProgressKey(memberId ?? 0),
    enabled: enabled && memberId != null && memberId > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await apiFetch(`/api/users/${memberId}/progress`);
      return parseJsonResponse<MemberWorkoutProgress>(res);
    },
  });
}
