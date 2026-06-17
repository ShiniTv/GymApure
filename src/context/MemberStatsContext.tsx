import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { useAuth } from './AuthContext';

export interface MemberStats {
  subscription: {
    membership_name: string;
    days_remaining: number;
    end_date: string;
    duration_days: number;
  } | null;
  progressPercent: number;
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
}

interface MemberStatsContextValue {
  stats: MemberStats | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const MemberStatsContext = createContext<MemberStatsContextValue | null>(null);

let inflightRequest: Promise<MemberStats> | null = null;

async function fetchMemberStats(): Promise<MemberStats> {
  if (inflightRequest) return inflightRequest;

  inflightRequest = apiFetch('/api/stats/member')
    .then((res) => parseJsonResponse<MemberStats>(res))
    .finally(() => {
      inflightRequest = null;
    });

  return inflightRequest;
}

export function MemberStatsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (user?.role !== 'member') return;
    setLoading(true);
    try {
      const data = await fetchMemberStats();
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== 'member') {
      setStats(null);
      setLoading(false);
      return;
    }

    void refresh();
  }, [user?.role, user?.id, refresh]);

  const value = useMemo(
    () => ({ stats, loading, refresh }),
    [stats, loading, refresh]
  );

  return (
    <MemberStatsContext.Provider value={value}>{children}</MemberStatsContext.Provider>
  );
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
