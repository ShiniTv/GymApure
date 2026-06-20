import { useQuery } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';

export interface MembershipPlan {
  id: number;
  name: string;
  duration_days: number;
  price_usd: number;
}

async function fetchMembershipPlans(): Promise<MembershipPlan[]> {
  const res = await apiFetch('/api/memberships');
  const data = await parseJsonResponse<MembershipPlan[]>(res);
  return Array.isArray(data) ? data : [];
}

export function useMembershipPlansQuery(enabled = true) {
  return useQuery({
    queryKey: ['memberships', 'plans'],
    queryFn: fetchMembershipPlans,
    enabled,
  });
}
