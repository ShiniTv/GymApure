import { useQuery } from '@tanstack/react-query';
import { apiFetchWithRetry, parseJsonResponse } from '../../lib/api';

export interface TrainerStatsResponse {
  assignedMembers: number;
  activeNow: number;
  todayWorkouts: number;
  routinesCreated: number;
  recentActivities: {
    user_id: number;
    full_name: string;
    routine_name: string;
    start_time: string;
  }[];
  membersWithoutRoutines?: number;
  expiringMembers?: {
    id: number;
    full_name: string;
    days_remaining: number;
    membership_name?: string;
  }[];
  inactiveMembers?: {
    id: number;
    full_name: string;
    last_workout: string | null;
    days_since: number;
  }[];
  trainingToday?: {
    id: number;
    full_name: string;
    check_in_time: string;
  }[];
  expiryAlertDays?: number;
}

async function fetchTrainerStats(): Promise<TrainerStatsResponse> {
  const res = await apiFetchWithRetry('/api/stats/trainer', { timeout: 15_000 });
  const data = await parseJsonResponse<TrainerStatsResponse>(res);
  if (data?.recentActivities && !Array.isArray(data.recentActivities)) {
    data.recentActivities = [];
  }
  if (data && !Array.isArray(data.expiringMembers)) {
    data.expiringMembers = [];
  }
  return data;
}

export function useTrainerStatsQuery(enabled = true) {
  return useQuery({
    queryKey: ['trainer-stats'],
    queryFn: fetchTrainerStats,
    enabled,
    staleTime: 30_000,
    retry: 1,
  });
}
