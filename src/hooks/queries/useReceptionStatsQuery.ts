import { useQuery } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';

export interface ReceptionStats {
  todayCheckIns: number;
  insideNow: number;
  pendingPayments: number;
}

async function fetchReceptionStats(): Promise<ReceptionStats> {
  const res = await apiFetch('/api/stats/reception');
  return parseJsonResponse<ReceptionStats>(res);
}

export function useReceptionStatsQuery(enabled = true) {
  return useQuery({
    queryKey: ['reception-stats'],
    queryFn: fetchReceptionStats,
    enabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
}
