import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import type { MemberOnboarding } from '../../components/members/OnboardingStatus';
import {
  applyOptimisticUpdate,
  rollbackOptimistic,
  type OptimisticContext,
} from '../../lib/optimisticMutation';

export interface Member {
  id: number;
  full_name: string;
  email: string;
  cedula: string;
  status: 'active' | 'inactive';
  role: string;
  last_workout: string | null;
  membership_name?: string | null;
  subscription_end?: string | null;
  days_remaining?: number | null;
  subscription_status?: 'active' | 'paused' | null;
  training_shift?: 'diurno' | 'vespertino' | 'nocturno' | null;
  profile_image?: string | null;
  phone?: string | null;
  dob?: string | null;
  created_at?: string | null;
  onboarding?: MemberOnboarding | null;
}

export interface PaginatedUsers {
  items: Member[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MembersQueryParams {
  page: number;
  pageSize: number;
  search: string;
  expiringFilter: boolean;
  shiftFilter?: string;
  /** Admin role filter; trainers always force member via isTrainer. */
  roleFilter?: string;
  isTrainer: boolean;
}

export function membersQueryKey(params: MembersQueryParams) {
  return ['members', params] as const;
}

async function fetchMembers(params: MembersQueryParams): Promise<PaginatedUsers> {
  const qs = new URLSearchParams({
    page: String(params.page),
    limit: String(params.pageSize),
  });
  if (params.search) qs.set('q', params.search);
  if (params.expiringFilter) qs.set('expiring', 'true');
  if (params.shiftFilter) qs.set('shift', params.shiftFilter);
  if (params.isTrainer) qs.set('role', 'member');
  else if (params.roleFilter) qs.set('role', params.roleFilter);

  const res = await apiFetch(`/api/users?${qs.toString()}`);
  return parseJsonResponse<PaginatedUsers>(res);
}

export function useMembersQuery(params: MembersQueryParams) {
  return useQuery({
    queryKey: membersQueryKey(params),
    queryFn: () => fetchMembers(params),
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

export function useInvalidateMembers() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['members'] });
}

interface MembershipStatusVariables {
  memberId: number;
  status: 'active' | 'paused';
  reason?: string;
}

export function useMembershipStatusMutation(params: MembersQueryParams) {
  const queryClient = useQueryClient();
  const queryKey = membersQueryKey(params);

  return useMutation<unknown, Error, MembershipStatusVariables, OptimisticContext<PaginatedUsers>>({
    mutationFn: async ({ memberId, status, reason }) => {
      const endpoint = status === 'paused' ? 'pause' : 'resume';
      const res = await apiFetch(`/api/memberships/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: memberId,
          ...(reason ? { reason } : {}),
        }),
      });
      return parseJsonResponse(res);
    },
    onMutate: ({ memberId, status }) =>
      applyOptimisticUpdate<PaginatedUsers>(queryClient, queryKey, (previous) => ({
        ...(previous ?? {
          items: [],
          total: 0,
          page: params.page,
          pageSize: params.pageSize,
        }),
        items:
          previous?.items.map((member) =>
            member.id === memberId ? { ...member, subscription_status: status } : member
          ) ?? [],
      })),
    onError: (_error, _variables, context) => {
      rollbackOptimistic(queryClient, context);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  });
}
