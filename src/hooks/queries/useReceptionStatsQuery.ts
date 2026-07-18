import { useQuery } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import { useSocket } from '../../context/SocketContext';

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
  const { isConnected } = useSocket();
  return useQuery({
    queryKey: ['reception-stats'],
    queryFn: fetchReceptionStats,
    enabled,
    refetchInterval: isConnected ? 60_000 : 30_000,
    refetchOnWindowFocus: true,
    staleTime: 20_000,
  });
}
