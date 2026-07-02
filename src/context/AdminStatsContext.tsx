import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { useAuth } from './AuthContext';

export interface AdminStats {
  totalRevenue: number;
  pendingPayments: number;
  activeSubscriptions: number;
  todayCheckIns: number;
  yesterdayCheckIns: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  expiringSoon: number;
  expiredThisWeek: number;
  expiringList: {
    user_id: number;
    full_name: string;
    membership_name: string;
    days_remaining: number;
    end_date: string;
  }[];
  expiryAlertDays: number;
  revenueHistory: { month: string; income: string | number }[];
  revenueDaily: { date: string; income: string | number }[];
  lastDoorAlert: {
    full_name: string;
    membership_name: string;
    days_remaining: number;
    check_in_time: string;
  } | null;
}

interface AdminStatsContextValue {
  stats: AdminStats | null;
  loading: boolean;
  expiringSoon: number;
  refresh: () => Promise<void>;
}

const AdminStatsContext = createContext<AdminStatsContextValue | null>(null);

async function fetchAdminStats(): Promise<AdminStats> {
  const data = await apiFetch('/api/stats/admin').then((res) =>
    parseJsonResponse<AdminStats>(res)
  );
  if (data.revenueHistory && !Array.isArray(data.revenueHistory)) {
    data.revenueHistory = [];
  }
  if (data.revenueDaily && !Array.isArray(data.revenueDaily)) {
    data.revenueDaily = [];
  }
  return data;
}

export function AdminStatsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const {
    data: stats,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchAdminStats,
    enabled: user?.role === 'admin',
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const value = useMemo(
    () => ({
      stats: stats ?? null,
      loading: isLoading,
      expiringSoon: stats?.expiringSoon ?? 0,
      refresh,
    }),
    [stats, isLoading, refresh]
  );

  return (
    <AdminStatsContext.Provider value={value}>
      {children}
    </AdminStatsContext.Provider>
  );
}

export function useAdminStats(): AdminStatsContextValue {
  const ctx = useContext(AdminStatsContext);
  if (!ctx) {
    throw new Error('useAdminStats must be used within AdminStatsProvider');
  }
  return ctx;
}

export function useAdminStatsOptional(): AdminStatsContextValue | null {
  return useContext(AdminStatsContext);
}
