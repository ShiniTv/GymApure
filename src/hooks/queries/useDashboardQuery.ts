import { keepPreviousData, useQuery } from '@tanstack/react-query';
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
  remoteTrainingNow?: {
    id: number;
    full_name: string;
    started_at: string;
  }[];
  remoteActiveNow?: number;
  membersWithoutAssessment?: {
    id: number;
    full_name: string;
  }[];
  staleCheckins?: {
    id: number;
    full_name: string;
    days_since: number;
  }[];
  recoveryAlerts?: {
    id: number;
    full_name: string;
    discomfort: number;
    energy: number;
  }[];
  memberChoices?: {
    id: number;
    member_id: number;
    event_type: string;
    routine_id: number | null;
    metadata: Record<string, unknown>;
    created_at: string;
    member_name?: string;
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
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });
}

export interface TrainerAppointment {
  id: number;
  member_id: number;
  member_name?: string;
  starts_at: string;
  ends_at: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
}

async function fetchTrainerAppointments(): Promise<TrainerAppointment[]> {
  const res = await apiFetchWithRetry('/api/appointments', { timeout: 15_000 });
  const data = await parseJsonResponse<TrainerAppointment[]>(res);
  return Array.isArray(data) ? data : [];
}

export function useTrainerAppointmentsQuery(enabled = true) {
  return useQuery({
    queryKey: ['trainer-appointments'],
    queryFn: fetchTrainerAppointments,
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });
}
