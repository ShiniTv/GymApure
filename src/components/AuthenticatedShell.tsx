import { Suspense, lazy, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { AdminStatsProvider } from '../context/AdminStatsContext';
import { MemberStatsProvider } from '../context/MemberStatsContext';
import { SocketProvider } from '../context/SocketContext';
import { DashboardSkeleton } from './ui';

const Layout = lazy(() => import('./Layout'));

function ShellLoader() {
  return (
    <div
      className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8"
      aria-busy="true"
      aria-label="Cargando panel"
    >
      <DashboardSkeleton />
    </div>
  );
}

function RoleProviders({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  let content = children;

  if (user?.role === 'member') {
    content = <MemberStatsProvider>{content}</MemberStatsProvider>;
  } else if (user?.role === 'admin') {
    content = <AdminStatsProvider>{content}</AdminStatsProvider>;
  }

  return <SocketProvider>{content}</SocketProvider>;
}

export default function AuthenticatedShell() {
  return (
    <RoleProviders>
      <Suspense fallback={<ShellLoader />}>
        <Layout />
      </Suspense>
    </RoleProviders>
  );
}
