import { Link } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { getDefaultRouteForRole } from '../../lib/roles';

interface BackToDashboardLinkProps {
  iconOnly?: boolean;
  className?: string;
  to?: string;
  label?: string;
}

export function BackToDashboardLink({ iconOnly, className, to, label }: BackToDashboardLinkProps) {
  const { user } = useAuth();
  const home = to ?? getDefaultRouteForRole(user?.role ?? 'member');
  const homeLabel = label ?? (user?.role === 'receptionist' ? 'Inicio' : 'Dashboard');

  if (iconOnly) {
    return (
      <Link
        to={home}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-brand hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
          className
        )}
        aria-label={`Volver a ${homeLabel}`}
        title={homeLabel}
      >
        <LayoutDashboard className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <Link
      to={home}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2.5 text-[11px] sm:text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-brand hover:border-brand/30 transition-colors',
        className
      )}
      title={`Volver a ${homeLabel}`}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" />
      {homeLabel}
    </Link>
  );
}
