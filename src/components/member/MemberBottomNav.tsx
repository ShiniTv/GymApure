import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dumbbell, LogOut } from 'lucide-react';
import clsx from 'clsx';
import { LogoutConfirmModal, useLogoutConfirm } from '../LogoutConfirmModal';
import { Sheet } from '../ui';
import { useMemberStatsOptional } from '../../context/MemberStatsContext';
import { useChatUnreadQuery } from '../../hooks/queries/useChatQuery';
import {
  MEMBER_PRIMARY_TABS,
  MEMBER_MORE_ITEMS,
  isMemberFabRoute,
} from '../../config/navigation/memberBottomNav';
import { routePrefetchHandlers } from '../../lib/routePrefetch';

const FAB_ROOT_CLASS = 'member-has-workout-fab';

export function MemberBottomNav() {
  const location = useLocation();
  const { requestLogout, logoutConfirmProps } = useLogoutConfirm();
  const memberStats = useMemberStatsOptional();
  const { data: chatUnread = 0 } = useChatUnreadQuery(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const primaryRoutine = memberStats?.stats?.primaryRoutine;
  const completedToday = new Set(memberStats?.stats?.completedRoutineIdsToday ?? []);
  const primaryCompletedToday = primaryRoutine ? completedToday.has(primaryRoutine.id) : false;
  const workoutHref = primaryRoutine ? `/workout/${primaryRoutine.id}` : '/routines';

  const showWorkoutFab =
    !!primaryRoutine?.id && isMemberFabRoute(location.pathname) && !primaryCompletedToday;

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle(FAB_ROOT_CLASS, showWorkoutFab);
    return () => {
      document.documentElement.classList.remove(FAB_ROOT_CLASS);
    };
  }, [showWorkoutFab]);

  const isMoreItemActive = MEMBER_MORE_ITEMS.some(
    (item) => location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
  );

  const isTabActive = (href: string, action?: 'more') => {
    if (href === '/panel') return location.pathname === '/panel';
    if (action === 'more') return isMoreItemActive || moreOpen;
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  const sheetBottomStyle = {
    bottom: showWorkoutFab
      ? 'calc(var(--member-nav-stack) + var(--member-fab-size, 3.5rem) + var(--member-fab-gap, 0.75rem) + env(safe-area-inset-bottom, 0px))'
      : 'calc(var(--member-nav-stack) + env(safe-area-inset-bottom, 0px))',
  } as const;
  const closeMore = () => {
    setMoreOpen(false);
    moreButtonRef.current?.focus();
  };

  return (
    <>
      <Sheet
        open={moreOpen}
        onClose={closeMore}
        title="Más opciones"
        closeLabel="Cerrar menú"
        side="bottom"
        panelStyle={sheetBottomStyle}
        zIndex={46}
        className="px-4"
        scrollable
      >
        <ul className="space-y-1">
          {MEMBER_MORE_ITEMS.map((item) => {
            const itemActive =
              location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  {...routePrefetchHandlers(item.href)}
                  onClick={closeMore}
                  className={clsx(
                    'flex min-h-[var(--touch-min)] touch-manipulation items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors',
                    itemActive
                      ? 'bg-brand/10 text-brand'
                      : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/60'
                  )}
                  aria-current={itemActive ? 'page' : undefined}
                >
                  <span
                    className={clsx(
                      'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                      itemActive ? 'bg-brand text-white' : 'text-brand bg-zinc-100 dark:bg-zinc-800'
                    )}
                  >
                    <item.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="flex-1 truncate">{item.name}</span>
                  {item.showUnreadBadge && chatUnread > 0 && (
                    <span className="bg-brand flex h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
                      {chatUnread > 99 ? '99+' : chatUnread}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => {
                closeMore();
                requestLogout();
              }}
              className="flex min-h-[var(--touch-min)] w-full touch-manipulation items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                <LogOut className="h-4 w-4" aria-hidden />
              </span>
              <span className="flex-1 truncate text-left">Cerrar sesión</span>
            </button>
          </li>
        </ul>
      </Sheet>

      <div className="member-bottom-nav pointer-events-none fixed right-0 bottom-0 left-0 z-50 px-4 lg:hidden">
        {showWorkoutFab && (
          <Link
            to={workoutHref}
            {...routePrefetchHandlers(workoutHref)}
            className="member-bottom-nav-fab pointer-events-auto absolute touch-manipulation"
            aria-label="Entrenar"
          >
            <span className="brand-solid flex h-full w-full items-center justify-center rounded-2xl shadow-lg ring-2 ring-white/90 transition-transform active:scale-95 dark:ring-zinc-950/90">
              <Dumbbell className="h-6 w-6 text-white" aria-hidden />
            </span>
          </Link>
        )}

        <nav
          className="member-bottom-nav-pill pointer-events-auto relative mx-auto max-w-md"
          aria-label="Navegación principal"
        >
          <ul className="flex items-center justify-around px-3 py-2">
            {MEMBER_PRIMARY_TABS.map((item) => {
              const active = isTabActive(item.href, item.action);

              if (item.action === 'more') {
                return (
                  <li key={item.name} className="flex flex-1 justify-center">
                    <button
                      ref={moreButtonRef}
                      type="button"
                      onClick={() => setMoreOpen((v) => !v)}
                      className={clsx(
                        'inline-flex min-h-[var(--touch-min)] min-w-[var(--touch-min)] touch-manipulation items-center justify-center rounded-xl transition-colors',
                        active ? 'text-brand' : 'text-zinc-500 dark:text-zinc-400'
                      )}
                      aria-expanded={moreOpen}
                      aria-label={
                        chatUnread > 0 ? `${item.name}, ${chatUnread} sin leer` : item.name
                      }
                    >
                      <span className="relative">
                        <span
                          className={clsx(
                            'member-bottom-nav-tab-icon',
                            (active || moreOpen) && 'member-bottom-nav-tab-icon--active'
                          )}
                        >
                          <item.icon className="h-5 w-5" aria-hidden />
                        </span>
                        {chatUnread > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-[0.875rem] min-w-[0.875rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white ring-2 ring-white dark:ring-zinc-900">
                            {chatUnread > 9 ? '9+' : chatUnread}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              }

              return (
                <li key={item.name} className="flex flex-1 justify-center">
                  <Link
                    to={item.href}
                    {...routePrefetchHandlers(item.href)}
                    className={clsx(
                      'inline-flex min-h-[var(--touch-min)] min-w-[var(--touch-min)] touch-manipulation items-center justify-center rounded-xl transition-colors',
                      active ? 'text-brand' : 'text-zinc-500 dark:text-zinc-400'
                    )}
                    aria-label={item.name}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className="relative">
                      <span
                        className={clsx(
                          'member-bottom-nav-tab-icon',
                          active && 'member-bottom-nav-tab-icon--active'
                        )}
                      >
                        <item.icon className="h-5 w-5" aria-hidden />
                      </span>
                      {item.showUnreadBadge && chatUnread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-[0.875rem] min-w-[0.875rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white ring-2 ring-white dark:ring-zinc-900">
                          {chatUnread > 9 ? '9+' : chatUnread}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <LogoutConfirmModal {...logoutConfirmProps} />
    </>
  );
}
