import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Dumbbell,
  UtensilsCrossed,
  UserCircle,
  ListChecks,
  CreditCard,
  LayoutGrid,
  MessageSquare,
  History,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { useMemberStatsOptional } from '../../context/MemberStatsContext';
import { useChatUnreadQuery } from '../../hooks/queries/useChatQuery';

const PRIMARY_ITEMS: {
  name: string;
  href: string;
  icon: typeof Home;
  center?: boolean;
}[] = [
  { name: 'Inicio', href: '/', icon: Home },
  { name: 'Rutinas', href: '/routines', icon: ListChecks },
  { name: 'Entrenar', href: '__workout__', icon: Dumbbell, center: true },
  { name: 'Pagos', href: '/payments', icon: CreditCard },
  { name: 'Más', href: '__more__', icon: LayoutGrid },
];

const MORE_ITEMS = [
  { name: 'Mensajes', href: '/messages', icon: MessageSquare },
  { name: 'Historial', href: '/history', icon: History },
  { name: 'Perfil', href: '/profile', icon: UserCircle },
  { name: 'Nutrición', href: '/nutrition', icon: UtensilsCrossed },
] as const;

export function MemberBottomNav() {
  const location = useLocation();
  const memberStats = useMemberStatsOptional();
  const { data: chatUnread = 0 } = useChatUnreadQuery(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const workoutHref = memberStats?.stats?.primaryRoutine
    ? `/workout/${memberStats.stats.primaryRoutine.id}`
    : '/routines';

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [moreOpen]);

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    if (href === '__workout__') {
      return location.pathname.startsWith('/workout/');
    }
    if (href === '__more__') {
      return MORE_ITEMS.some(
        (item) => location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
      );
    }
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {moreOpen && (
        <div
          className="fixed inset-0 z-[45] bg-black/40 lg:hidden"
          aria-hidden
          onClick={() => setMoreOpen(false)}
        />
      )}

      <div
        ref={sheetRef}
        className={clsx(
          'fixed left-0 right-0 z-[46] lg:hidden px-4 transition-transform duration-200 ease-out',
          moreOpen ? 'translate-y-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))]' : 'translate-y-full bottom-0 pointer-events-none'
        )}
      >
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl p-2 mb-2">
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <p className="text-xs font-bold text-zinc-900 dark:text-white">Más opciones</p>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="grid grid-cols-2 gap-1">
            {MORE_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                >
                  <item.icon className="h-4 w-4 text-brand shrink-0" />
                  <span className="truncate">{item.name}</span>
                  {item.href === '/messages' && chatUnread > 0 && (
                    <span className="ml-auto min-w-[1.125rem] h-[1.125rem] px-1 flex items-center justify-center rounded-full bg-brand text-white text-[9px] font-bold">
                      {chatUnread > 99 ? '99+' : chatUnread}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <nav
        className="member-bottom-nav fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md"
        aria-label="Navegación principal"
      >
        <ul className="flex items-stretch justify-around px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
          {PRIMARY_ITEMS.map((item) => {
            const href = item.href === '__workout__' ? workoutHref : item.href;
            const active = isActive(item.href);

            if (item.href === '__more__') {
              return (
                <li key={item.name} className="flex-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setMoreOpen((v) => !v)}
                    className={clsx(
                      'flex flex-col items-center justify-center gap-0.5 min-h-[var(--touch-min)] min-w-[var(--touch-min)] px-2 rounded-xl text-[10px] font-semibold transition-colors touch-manipulation w-full',
                      active || moreOpen
                        ? 'text-brand'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    )}
                    aria-expanded={moreOpen}
                    aria-label="Más opciones"
                  >
                    <span className="relative">
                      <item.icon className={clsx('h-5 w-5', (active || moreOpen) && 'text-brand')} aria-hidden />
                      {chatUnread > 0 && (
                        <span className="absolute -top-1 -right-1.5 min-w-[0.875rem] h-[0.875rem] px-0.5 flex items-center justify-center rounded-full bg-brand text-white text-[8px] font-bold">
                          {chatUnread > 9 ? '9+' : chatUnread}
                        </span>
                      )}
                    </span>
                    <span>{item.name}</span>
                  </button>
                </li>
              );
            }

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
    </>
  );
}
