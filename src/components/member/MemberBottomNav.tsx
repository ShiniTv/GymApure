import { Link, useLocation } from 'react-router-dom';
import { Home, Dumbbell, UtensilsCrossed, UserCircle, ListChecks } from 'lucide-react';
import clsx from 'clsx';
import { useMemberStatsOptional } from '../../context/MemberStatsContext';

const NAV_ITEMS: {
  name: string;
  href: string;
  icon: typeof Home;
  center?: boolean;
}[] = [
  { name: 'Inicio', href: '/', icon: Home },
  { name: 'Rutinas', href: '/routines', icon: ListChecks },
  { name: 'Entrenar', href: '__workout__', icon: Dumbbell, center: true },
  { name: 'Nutrición', href: '/nutrition', icon: UtensilsCrossed },
  { name: 'Perfil', href: '/profile', icon: UserCircle },
];

export function MemberBottomNav() {
  const location = useLocation();
  const memberStats = useMemberStatsOptional();
  const workoutHref = memberStats?.stats?.primaryRoutine
    ? `/workout/${memberStats.stats.primaryRoutine.id}`
    : '/routines';

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    if (href === '__workout__') {
      return location.pathname.startsWith('/workout/');
    }
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      className="member-bottom-nav fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md"
      aria-label="Navegación principal"
    >
      <ul className="flex items-stretch justify-around px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {NAV_ITEMS.map((item) => {
          const href = item.href === '__workout__' ? workoutHref : item.href;
          const active = isActive(item.href);

          if (item.center) {
            return (
              <li key={item.name} className="flex items-center -mt-3">
                <Link
                  to={href}
                  className={clsx(
                    'flex flex-col items-center justify-center min-h-[var(--touch-comfort)] min-w-[var(--touch-comfort)] rounded-2xl brand-solid shadow-lg transition-transform active:scale-95 touch-manipulation',
                    active && 'ring-2 ring-brand/30 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.icon className="h-6 w-6" aria-hidden />
                  <span className="sr-only">{item.name}</span>
                </Link>
              </li>
            );
          }

          return (
            <li key={item.name} className="flex-1 flex justify-center">
              <Link
                to={href}
                className={clsx(
                  'flex flex-col items-center justify-center gap-0.5 min-h-[var(--touch-min)] min-w-[var(--touch-min)] px-2 rounded-xl text-[10px] font-semibold transition-colors touch-manipulation',
                  active
                    ? 'text-brand'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <item.icon className={clsx('h-5 w-5', active && 'text-brand')} aria-hidden />
                <span>{item.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
