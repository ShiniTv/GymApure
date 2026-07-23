import { queryClient } from './queryClient';
import { apiFetch, parseJsonResponse } from './api';
import { membersQueryKey } from '../hooks/queries/useMembersQuery';
import { paymentsQueryKey } from '../hooks/queries/usePaymentsQuery';

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

export function routePrefetchHandlers(href: string) {
  return {
    onMouseEnter: () => prefetchRoute(href),
    onFocus: () => prefetchRoute(href),
  };
}
