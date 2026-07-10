const prefetched = new Set<string>();

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
  '/check-in': () => import('../pages/CheckIn'),
};

export function prefetchRoute(href: string): void {
  const [path] = href.split('?');
  const loader = ROUTE_PREFETCH[path];
  if (!loader || prefetched.has(path)) return;

  prefetched.add(path);
  void loader();
}

export function routePrefetchHandlers(href: string) {
  return {
    onMouseEnter: () => prefetchRoute(href),
    onFocus: () => prefetchRoute(href),
  };
}
