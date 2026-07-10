import { Suspense, lazy, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { AdminStatsProvider } from '../context/AdminStatsContext';
import { MemberStatsProvider } from '../context/MemberStatsContext';
import { SocketProvider } from '../context/SocketContext';
import { Spinner } from './ui';

const Layout = lazy(() => import('./Layout'));

function ShellLoader() {
  return (
    <div className="flex h-dvh items-center justify-center bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-white">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" />
        <p className="text-[11px] font-bold tracking-[0.15em] text-zinc-400 uppercase dark:text-zinc-500">
          Cargando...
        </p>
      </div>
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
