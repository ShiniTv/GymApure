import { queryClient } from './queryClient';
import { apiFetch, parseJsonResponse } from './api';
import { membersQueryKey } from '../hooks/queries/useMembersQuery';
import { paymentsQueryKey } from '../hooks/queries/usePaymentsQuery';
import {
  EXERCISES_CATALOG_QUERY_KEY,
  fetchExercisesCatalog,
} from '../hooks/queries/useExercisesQuery';
import type { UserRole } from './roles';

const prefetched = new Set<string>();
const dataPrefetched = new Set<string>();

const ROUTE_PREFETCH: Record<string, () => Promise<unknown>> = {
  '/panel': () => import('../pages/Dashboard'),
  '/members': () => import('../pages/Members'),
  '/memberships': () => import('../pages/Memberships'),
  '/trainers': () => import('../pages/Trainers'),
  '/equipment': () => import('../pages/Equipment'),
  '/payments': () => import('../pages/Payments'),
  '/attendance': () => import('../pages/Attendance'),
  '/reports': () => import('../pages/Reports'),
  '/audit-logs': () => import('../pages/AuditLogs'),
  '/nutrition-overview': () => import('../pages/NutritionOverview'),
  '/messages': () => import('../pages/Messages'),
  '/profile': () => import('../pages/Profile'),
  '/settings': () => import('../pages/Settings'),
  '/reception': () => import('../pages/Reception'),
  '/routines': () => import('../pages/Routines'),
  '/exercises': () => import('../pages/Exercises'),
  '/nutrition': () => import('../pages/member/MemberNutrition'),
  '/history': () => import('../pages/WorkoutHistory'),
  '/history/records': () => import('../pages/ExerciseRecords'),
  '/check-in': () => import('../pages/CheckIn'),
  '/demo-leads': () => import('../pages/DemoLeads'),
  '/security': () => import('../pages/MfaSecurity'),
};

function prefetchRouteData(path: string): void {
  if (dataPrefetched.has(path)) return;

  if (path === '/members') {
    dataPrefetched.add(path);
    const params = {
      page: 1,
      pageSize: 20,
      search: '',
      expiringFilter: false,
      isTrainer: false,
    };
    void queryClient.prefetchQuery({
      queryKey: membersQueryKey(params),
      queryFn: async () => {
        const qs = new URLSearchParams({ page: '1', limit: '20' });
        const res = await apiFetch(`/api/users?${qs.toString()}`);
        return parseJsonResponse(res);
      },
    });
    return;
  }

  if (path === '/payments') {
    dataPrefetched.add(path);
    const params = { page: 1, pageSize: 20, statusFilter: 'pending' };
    void queryClient.prefetchQuery({
      queryKey: paymentsQueryKey(params),
      queryFn: async () => {
        const qs = new URLSearchParams({
          page: '1',
          limit: '20',
          status: 'pending',
        });
        const res = await apiFetch(`/api/payments?${qs.toString()}`);
        return parseJsonResponse(res);
      },
    });
    return;
  }

  if (path === '/panel') {
    // AdminStatsProvider already loads /api/stats/admin for admins only.
    // Prefetching here caused 403 noise for trainer/member/reception.
    return;
  }

  if (path === '/exercises' || path === '/routines') {
    dataPrefetched.add(path);
    void queryClient.prefetchQuery({
      queryKey: EXERCISES_CATALOG_QUERY_KEY,
      queryFn: fetchExercisesCatalog,
      staleTime: 5 * 60_000,
    });
  }
}

export function prefetchRoute(href: string): void {
  const [path] = href.split('?');
  const loader = ROUTE_PREFETCH[path];
  if (loader && !prefetched.has(path)) {
    prefetched.add(path);
    void loader();
  }
  prefetchRouteData(path);
}

function canPrefetchAfterLogin(): boolean {
  if (typeof navigator === 'undefined') return false;
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;

  return !connection?.saveData && !['slow-2g', '2g'].includes(connection?.effectiveType ?? '');
}

function prefetchRoleStats(role: UserRole, userId: number): void {
  if (role === 'admin') {
    void queryClient.prefetchQuery({
      queryKey: ['admin-stats'],
      queryFn: async () => {
        const res = await apiFetch('/api/stats/admin');
        return parseJsonResponse(res);
      },
      staleTime: 45_000,
    });
    return;
  }

  if (role === 'member') {
    void queryClient.prefetchQuery({
      queryKey: ['member-stats', userId],
      queryFn: async () => {
        const res = await apiFetch('/api/stats/member');
        return parseJsonResponse(res);
      },
      staleTime: 60_000,
    });
    return;
  }

  if (role === 'receptionist') {
    void queryClient.prefetchQuery({
      queryKey: ['reception-stats'],
      queryFn: async () => {
        const res = await apiFetch('/api/stats/reception');
        return parseJsonResponse(res);
      },
      staleTime: 20_000,
    });
  }
}

/**
 * Starts the authenticated chrome, safe destination and role-owned dashboard data
 * in parallel. It never blocks navigation and is skipped on constrained networks.
 */
export function prefetchPostLogin({
  destination,
  role,
  userId,
}: {
  destination: string;
  role: UserRole;
  userId: number;
}): void {
  if (!canPrefetchAfterLogin()) return;

  void import('../components/AuthenticatedShell');
  void import('../components/Layout');
  prefetchRoute(destination);
  prefetchRoleStats(role, userId);
}

export function routePrefetchHandlers(href: string) {
  return {
    onMouseEnter: () => prefetchRoute(href),
    onFocus: () => prefetchRoute(href),
  };
}
