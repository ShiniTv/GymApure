import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import {
  getCachedAdminStats,
  invalidateAdminStatsCache,
  setCachedAdminStats,
} from '../lib/adminStatsCache';
import { useAuth } from './AuthContext';

export interface AdminStats {
  totalRevenue: number;
  pendingPayments: number;
  activeSubscriptions: number;
  todayCheckIns: number;
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

let inflightRequest: Promise<AdminStats> | null = null;

async function fetchAdminStats(): Promise<AdminStats> {
  if (inflightRequest) return inflightRequest;

  inflightRequest = apiFetch('/api/stats/admin')
    .then((res) => parseJsonResponse<AdminStats>(res))
    .then((data) => {
      if (data.revenueHistory && !Array.isArray(data.revenueHistory)) {
        data.revenueHistory = [];
      }
      return data;
    })
    .finally(() => {
      inflightRequest = null;
    });

  return inflightRequest;
}

export function AdminStatsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (user?.role !== 'admin') return;
    invalidateAdminStatsCache();
    setLoading(true);
    try {
      const data = await fetchAdminStats();
      setCachedAdminStats(data);
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      setStats(null);
      setLoading(false);
      return;
    }

    const cached = getCachedAdminStats<AdminStats>();
    if (cached) {
      setStats(cached);
      setLoading(false);
      void (async () => {
        try {
          const data = await fetchAdminStats();
          setCachedAdminStats(data);
          setStats(data);
        } catch {
          /* keep stale cache visible */
        }
      })();
    } else {
      void refresh();
    }

    const silentRefresh = () => {
      void fetchAdminStats()
        .then((data) => {
          setCachedAdminStats(data);
          setStats(data);
        })
        .catch(() => {});
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') silentRefresh();
    };

    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(silentRefresh, 30_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
    };
  }, [user?.role, refresh]);

  const value = useMemo(
    () => ({
      stats,
      loading,
      expiringSoon: stats?.expiringSoon ?? 0,
      refresh,
    }),
    [stats, loading, refresh]
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
