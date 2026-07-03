import { useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdminStats } from '../context/AdminStatsContext';
import { useMemberStatsOptional } from '../context/MemberStatsContext';
import { DashboardSkeleton } from '../components/ui';
import { useTrainerStatsQuery } from '../hooks/queries/useDashboardQuery';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshContainer } from '../components/PullToRefresh';
import MemberDashboardView from './member/MemberDashboard';
import AdminDashboard from './admin/AdminDashboard';
import TrainerDashboard from './trainer/TrainerDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const adminStats = useAdminStats();
  const memberStatsCtx = useMemberStatsOptional();
  const { isLoading: trainerLoading, refetch: refetchTrainer } = useTrainerStatsQuery();
  const isAdmin = user?.role === 'admin';
  const isMember = user?.role === 'member';
  const isReceptionist = user?.role === 'receptionist';

  const onRefresh = useCallback(async () => {
    if (isAdmin) {
      await adminStats.refresh();
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
    ? adminStats.loading && !adminStats.stats
    : isMember
      ? memberStatsCtx?.loading && !memberStats
      : isReceptionist
        ? false
        : trainerLoading;

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
          <MemberDashboardView />
        </div>
      </PullToRefreshContainer>
    );
  }

  if (user?.role === 'admin') {
    return (
      <PullToRefreshContainer pullDistance={pullDistance} isRefreshing={isRefreshing}>
        <div {...handlers}>
          <AdminDashboard />
        </div>
      </PullToRefreshContainer>
    );
  }

  return (
    <PullToRefreshContainer pullDistance={pullDistance} isRefreshing={isRefreshing}>
      <div {...handlers}>
        <TrainerDashboard />
      </div>
    </PullToRefreshContainer>
  );
}
