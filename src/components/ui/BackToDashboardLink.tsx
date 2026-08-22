import { Link } from 'react-router';
import { ArrowLeft, Home, LayoutGrid } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useMobileShell } from '../../context/MobileShellContext';
import { getDefaultRouteForRole } from '../../lib/roles';

interface BackToDashboardLinkProps {
  iconOnly?: boolean;
  className?: string;
  to?: string;
  label?: string;
}

function HomeIcon({ role }: { role: string | undefined }) {
  if (role === 'member' || role === 'receptionist') {
    return <Home className="h-4 w-4" aria-hidden />;
  }
  return <LayoutGrid className="h-4 w-4" aria-hidden />;
}

export function BackToDashboardLink({ iconOnly, className, to, label }: BackToDashboardLinkProps) {
  const { user } = useAuth();
  const { hideBackToDashboard } = useMobileShell();
  const home = to ?? getDefaultRouteForRole(user?.role ?? 'member');
  const homeLabel =
    label ?? (user?.role === 'member' || user?.role === 'receptionist' ? 'Inicio' : 'Panel');

  if (hideBackToDashboard) {
    return null;
  }

  if (iconOnly) {
    return (
      <Link
        to={home}
        className={cn(
          'hover:text-brand text-text-muted hover:bg-surface-raised inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
          className
        )}
        aria-label={`Volver a ${homeLabel}`}
        title={homeLabel}
      >
        <HomeIcon role={user?.role} />
      </Link>
    );
  }

  return (
    <Link
      to={home}
      className={cn(
        'hover:text-brand hover:border-brand/30 text-text-secondary border-border inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors sm:text-xs',
        className
      )}
      title={`Volver a ${homeLabel}`}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" />
      {homeLabel}
    </Link>
  );
}
