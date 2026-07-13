import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { useAuth } from './AuthContext';

export interface MemberStats {
  subscription: {
    membership_name: string;
    days_remaining: number;
    end_date: string;
    duration_days: number;
  } | null;
  remainingPercent: number;
  primaryRoutine: {
    id: number;
    name: string;
    difficulty: string;
    assigned_at: string;
    exercise_count: number;
  } | null;
  assignedRoutinesCount: number;
  pendingPayments: number;
  lastWorkout: { routine_name: string; start_time: string } | null;
  expiryAlertDays?: number;
  workoutsThisMonth: number;
  workoutsThisWeek?: number;
  workoutStreak?: number;
  weeklyTrainingGoal?: number;
  completedRoutineIdsToday?: number[];
}

interface MemberStatsContextValue {
  stats: MemberStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const MemberStatsContext = createContext<MemberStatsContextValue | null>(null);

async function fetchMemberStats(): Promise<MemberStats> {
  const res = await apiFetch('/api/stats/member');
  return parseJsonResponse<MemberStats>(res);
}

export function MemberStatsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const {
    data: stats,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['member-stats', user?.id],
    queryFn: fetchMemberStats,
    enabled: user?.role === 'member',
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const value = useMemo(
    () => ({
      stats: stats ?? null,
      loading: isLoading,
      error: isError ? 'No se pudieron cargar tus datos. Intenta de nuevo.' : null,
      refresh,
    }),
    [stats, isLoading, isError, refresh]
  );

  return <MemberStatsContext.Provider value={value}>{children}</MemberStatsContext.Provider>;
}

export function useMemberStats(): MemberStatsContextValue {
  const ctx = useContext(MemberStatsContext);
  if (!ctx) {
    throw new Error('useMemberStats must be used within MemberStatsProvider');
  }
  return ctx;
}

export function useMemberStatsOptional(): MemberStatsContextValue | null {
  return useContext(MemberStatsContext);
}
