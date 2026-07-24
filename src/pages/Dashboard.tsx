import { useCallback, lazy, Suspense } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useAdminStatsOptional } from '../context/AdminStatsContext';
import { useMemberStatsOptional } from '../context/MemberStatsContext';
import { DashboardSkeleton } from '../components/ui';
import { useTrainerStatsQuery } from '../hooks/queries/useDashboardQuery';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshContainer } from '../components/PullToRefresh';

const MemberDashboardView = lazy(() => import('./member/MemberDashboard'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
const TrainerDashboard = lazy(() => import('./trainer/TrainerDashboard'));

export default function Dashboard() {
  const { user } = useAuth();
  const adminStats = useAdminStatsOptional();
  const memberStatsCtx = useMemberStatsOptional();
  const isTrainer = user?.role === 'trainer';
  const {
    data: trainerStats,
    isPending: trainerLoading,
    refetch: refetchTrainer,
  } = useTrainerStatsQuery(isTrainer);
  const isAdmin = user?.role === 'admin';
  const isMember = user?.role === 'member';
  const isReceptionist = user?.role === 'receptionist';

  const onRefresh = useCallback(async () => {
    if (isAdmin) {
      await adminStats?.refresh();
    } else if (isMember) {
      await memberStatsCtx?.refresh();
    } else if (!isReceptionist) {
      await refetchTrainer();
    }
  }, [isAdmin, isMember, isReceptionist, adminStats, memberStatsCtx, refetchTrainer]);

  const { pullDistance, isRefreshing, handlers } = usePullToRefresh({
    onRefresh,
    threshold: 80,
  });

  const memberStats = memberStatsCtx?.stats ?? null;
  const pageLoading = isAdmin
    ? Boolean(adminStats?.loading && !adminStats?.stats)
    : isMember
      ? memberStatsCtx?.loading && !memberStats
      : isTrainer
        ? trainerLoading && !trainerStats
        : false;

  if (user?.role === 'receptionist') {
    return <Navigate to="/reception" replace />;
  }

  if (pageLoading) {
    return <DashboardSkeleton statCount={isAdmin ? 6 : isMember ? 3 : 4} />;
  }

  if (user?.role === 'member') {
    return (
      <PullToRefreshContainer pullDistance={pullDistance} isRefreshing={isRefreshing}>
        <div {...handlers}>
          <Suspense fallback={<DashboardSkeleton statCount={3} />}>
            <MemberDashboardView />
          </Suspense>
        </div>
      </PullToRefreshContainer>
    );
  }

  if (user?.role === 'admin') {
    return (
      <PullToRefreshContainer pullDistance={pullDistance} isRefreshing={isRefreshing}>
        <div {...handlers}>
          <Suspense fallback={<DashboardSkeleton statCount={6} />}>
            <AdminDashboard />
          </Suspense>
        </div>
      </PullToRefreshContainer>
    );
  }

  return (
    <PullToRefreshContainer pullDistance={pullDistance} isRefreshing={isRefreshing}>
      <div {...handlers}>
        <Suspense fallback={<DashboardSkeleton statCount={4} />}>
          <TrainerDashboard />
        </Suspense>
      </div>
    </PullToRefreshContainer>
  );
}
