import { useQuery } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';

export interface MemberChatOption {
  id: number;
  full_name: string;
  cedula: string | null;
}

export function memberOptionsQueryKey(search: string) {
  return ['users', 'options', 'member', search] as const;
}

async function fetchMemberOptions(search: string): Promise<MemberChatOption[]> {
  const res = await apiFetch(`/api/users/options?role=member&q=${encodeURIComponent(search)}`);
  const data = await parseJsonResponse<MemberChatOption[]>(res);
  return Array.isArray(data) ? data : [];
}

/** Member picker for staff chat "start conversation" search. */
export function useMemberOptionsQuery(search: string, enabled: boolean) {
  return useQuery({
    queryKey: memberOptionsQueryKey(search),
    queryFn: () => fetchMemberOptions(search),
    enabled: enabled && search.trim().length >= 2,
    staleTime: 30_000,
  });
}
