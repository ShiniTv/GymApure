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
      className="px-ds-4 py-ds-3 sm:p-ds-4 lg:p-ds-5 mx-auto w-full max-w-7xl"
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
