import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import type { Routine, RoutineAssignmentMember } from '../../pages/routines/types';
import type { Member } from './useMembersQuery';

export function useRoutinesLibraryQuery(enabled = true) {
  return useQuery({
    queryKey: ['routines', 'library'],
    queryFn: async () => {
      const res = await apiFetch('/api/routines');
      const data = await parseJsonResponse<Routine[]>(res);
      return Array.isArray(data) ? data : [];
    },
    enabled,
  });
}

export function useMemberRoutinesQuery(userId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ['routines', 'member', userId],
    queryFn: async () => {
      const res = await apiFetch(`/api/users/${userId}/routines`);
      const data = await parseJsonResponse<(Routine & { exercise_count?: number })[]>(res);
      return Array.isArray(data)
        ? data.map((r) => ({ ...r, exercise_count: r.exercise_count ?? 0 }))
        : [];
    },
    enabled: enabled && userId != null,
  });
}

export function useMemberOptionsQuery(enabled = true) {
  return useQuery({
    queryKey: ['users', 'options', 'member'],
    queryFn: async () => {
      const res = await apiFetch('/api/users/options?role=member');
      const data = await parseJsonResponse<Member[]>(res);
      return Array.isArray(data) ? data : [];
    },
    enabled,
  });
}

export function useRoutineAssignmentsQuery(enabled = true) {
  return useQuery({
    queryKey: ['routines', 'assignments'],
    queryFn: async () => {
      const res = await apiFetch('/api/routines/assignments/all');
      const data = await parseJsonResponse<RoutineAssignmentMember[]>(res);
      return Array.isArray(data) ? data : [];
    },
    enabled,
  });
}

export function useInvalidateRoutines() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['routines'] });
}
