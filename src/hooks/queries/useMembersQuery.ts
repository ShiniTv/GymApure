import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';

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
}

interface PaginatedUsers {
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
  if (params.isTrainer) qs.set('role', 'member');

  const res = await apiFetch(`/api/users?${qs.toString()}`);
  return parseJsonResponse<PaginatedUsers>(res);
}

export function useMembersQuery(params: MembersQueryParams) {
  return useQuery({
    queryKey: membersQueryKey(params),
    queryFn: () => fetchMembers(params),
  });
}

export function useInvalidateMembers() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['members'] });
}
