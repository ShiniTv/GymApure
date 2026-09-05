import { useState, useRef, useEffect, useMemo, Fragment } from 'react';
import { Link, useLocation } from 'react-router';
import { Dumbbell, LogOut, Moon, Sun } from 'lucide-react';
import { LogoutConfirmModal, useLogoutConfirm } from '../LogoutConfirmModal';
import { InstallPrompt } from '../InstallPrompt';
import { Sheet } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useMemberStatsOptional } from '../../context/MemberStatsContext';
import { useChatUnreadQuery } from '../../hooks/queries/useChatQuery';
import { useNotificationUnreadQuery } from '../../hooks/queries/useNotificationsQuery';
import {
  MEMBER_PRIMARY_TABS,
  MEMBER_MORE_ITEMS,
  isMemberFabRoute,
  type MemberMoreItem,
} from '../../config/navigation/memberBottomNav';
import { routePrefetchHandlers } from '../../lib/routePrefetch';
import { cn } from '../../lib/utils';

const FAB_ROOT_CLASS = 'member-has-workout-fab';

const tabClass =
  'inline-flex min-h-[var(--touch-min)] w-full max-w-[4.5rem] touch-manipulation flex-col items-center justify-center rounded-xl px-0.5 transition-[color,transform,opacity] duration-150 tap-feedback';

function memberDisplayName(name: string | undefined): { first: string; initials: string } {
  const trimmed = name?.trim() || 'Miembro';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? 'Miembro';
  const initials = parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
  return { first, initials: initials || 'M' };
}

function groupMoreItems(items: MemberMoreItem[]) {
  const sections: { label: string; items: MemberMoreItem[] }[] = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last?.label === item.section) {
      last.items.push(item);
    } else {
      sections.push({ label: item.section, items: [item] });
    }
  }
  return sections;
}

export function MemberBottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { requestLogout, logoutConfirmProps } = useLogoutConfirm();
  const memberStats = useMemberStatsOptional();
  const { data: chatUnread = 0 } = useChatUnreadQuery(true);
  const { data: notificationUnread = 0 } = useNotificationUnreadQuery(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const { first, initials } = useMemo(() => memberDisplayName(user?.name), [user?.name]);
  const moreItems = useMemo(() => {
    const showPt = memberStats?.stats?.showPtBilling === true;
    if (showPt) return MEMBER_MORE_ITEMS;
    return MEMBER_MORE_ITEMS.filter((item) => item.href !== '/pt-billing');
  }, [memberStats?.stats?.showPtBilling]);
  const moreSections = useMemo(() => groupMoreItems(moreItems), [moreItems]);

  const primaryRoutine = memberStats?.stats?.primaryRoutine;
  const todayRoutineId =
    memberStats?.stats?.todayRoutineId ?? memberStats?.stats?.primaryRoutine?.id ?? null;
  const fabRoutineId = todayRoutineId ?? primaryRoutine?.id ?? null;
  const completedToday = new Set(memberStats?.stats?.completedRoutineIdsToday ?? []);
  const primaryCompletedToday = fabRoutineId != null ? completedToday.has(fabRoutineId) : false;
  const workoutHref = fabRoutineId ? `/workout/${fabRoutineId}` : '/routines?view=templates';

  const showWorkoutFab =
    fabRoutineId != null && isMemberFabRoute(location.pathname) && !primaryCompletedToday;

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle(FAB_ROOT_CLASS, showWorkoutFab);
    return () => {
      document.documentElement.classList.remove(FAB_ROOT_CLASS);
    };
  }, [showWorkoutFab]);

  const isMoreItemActive = moreItems.some(
    (item) => location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
  );

  const isTabActive = (href: string, action?: 'more') => {
    if (href === '/panel') return location.pathname === '/panel';
    if (action === 'more') return isMoreItemActive || moreOpen;
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  const sheetBottomStyle = {
    bottom: 'calc(var(--member-nav-stack) + env(safe-area-inset-bottom, 0px))',
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
        cardClassName="mx-auto max-w-md"
        scrollable
        showHandle
        compact
      >
        <div className="mb-2 flex items-center gap-2">
          <div
            className="bg-brand/15 text-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-bold"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-text truncate text-[0.8125rem] font-semibold tracking-[-0.014em]">
              Hola, {first}
            </p>
            <p className="text-text-muted text-[0.6875rem] leading-tight">Tu cuenta y atajos</p>
          </div>
        </div>

        <div className="space-y-2">
          {moreSections.map((section) => (
            <div key={section.label}>
              <p className="text-text-muted mb-1 px-0.5 text-[0.6875rem] font-semibold tracking-[-0.01em]">
                {section.label}
              </p>
              <ul className="grid grid-cols-2 gap-1.5">
                {section.items.map((item) => {
                  const itemActive =
                    location.pathname === item.href ||
                    location.pathname.startsWith(`${item.href}/`);
                  const unreadLabel =
                    item.showUnreadBadge && chatUnread > 0
                      ? chatUnread === 1
                        ? '1 sin leer'
                        : `${chatUnread > 99 ? '99+' : chatUnread} sin leer`
                      : item.showNotificationBadge && notificationUnread > 0
                        ? notificationUnread === 1
                          ? '1 sin leer'
                          : `${notificationUnread > 99 ? '99+' : notificationUnread} sin leer`
                        : null;
                  return (
                    <li
                      key={item.href}
                      className={section.items.length === 1 ? 'col-span-2' : undefined}
                    >
                      <Link
                        to={item.href}
                        {...routePrefetchHandlers(item.href)}
                        onClick={closeMore}
                        className={cn(
                          'tap-feedback relative flex min-h-[3.25rem] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-[var(--radius-card)] border px-1.5 py-1.5 text-center transition-colors',
                          itemActive
                            ? 'border-border bg-surface-raised text-text'
                            : 'border-border/60 text-text-secondary hover:bg-surface-raised/70 hover:text-text bg-transparent'
                        )}
                        aria-current={itemActive ? 'page' : undefined}
                        aria-label={unreadLabel ? `${item.name}, ${unreadLabel}` : item.name}
                      >
                        {itemActive ? (
                          <span
                            className="bg-brand absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full"
                            aria-hidden
                          />
                        ) : null}
                        <span className="relative inline-flex">
                          <item.icon className="operate-icon h-4 w-4" aria-hidden />
                          {item.showUnreadBadge && chatUnread > 0 && (
                            <span className="member-bottom-nav-unread">
                              {chatUnread > 99 ? '99+' : chatUnread}
                            </span>
                          )}
                          {item.showNotificationBadge && notificationUnread > 0 && (
                            <span className="member-bottom-nav-unread">
                              {notificationUnread > 99 ? '99+' : notificationUnread}
                            </span>
                          )}
                        </span>
                        <span className="text-[0.6875rem] leading-tight font-semibold">
                          {item.name}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-border-subtle mt-2 space-y-1 border-t pt-1.5">
          <div className="px-0.5 empty:hidden">
            <InstallPrompt />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              className="tap-feedback text-text-secondary hover:bg-surface-overlay hover:text-text flex min-h-10 touch-manipulation items-center justify-center gap-1.5 rounded-[var(--radius-button)] px-2 text-xs font-medium transition-colors"
            >
              {theme === 'light' ? (
                <Moon className="operate-icon h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : (
                <Sun className="operate-icon h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              {theme === 'light' ? 'Oscuro' : 'Claro'}
            </button>
            <button
              type="button"
              onClick={() => {
                closeMore();
                requestLogout();
              }}
              className="tap-feedback text-danger hover:bg-danger/10 flex min-h-10 touch-manipulation items-center justify-center gap-1.5 rounded-[var(--radius-button)] px-2 text-xs font-medium transition-colors"
            >
              <LogOut className="operate-icon h-3.5 w-3.5 shrink-0" aria-hidden />
              Salir
            </button>
          </div>
        </div>
      </Sheet>

      <nav
        className="member-bottom-nav pointer-events-none fixed right-0 bottom-0 left-0 z-50 px-4 lg:hidden"
        aria-label="Navegación principal"
      >
        {showWorkoutFab && !moreOpen && (
          <Link
            to={workoutHref}
            {...routePrefetchHandlers(workoutHref)}
            className="member-bottom-nav-fab pointer-events-auto absolute touch-manipulation"
            aria-label="Entrenar"
          >
            <span className="brand-solid ring-bg tap-feedback flex h-full w-full items-center justify-center rounded-full ring-2 transition-[transform,opacity] duration-150">
              <Dumbbell className="h-5 w-5 text-white" aria-hidden />
            </span>
          </Link>
        )}

        <div className="member-bottom-nav-pill pointer-events-auto relative mx-auto max-w-md">
          <ul className="flex items-stretch justify-around px-2 py-1.5">
            {MEMBER_PRIMARY_TABS.map((item, index) => {
              const active = isTabActive(item.href, item.action);
              const insertFabSlot = showWorkoutFab && index === 2;

              const tab =
                item.action === 'more' ? (
                  <li key={item.name} className="flex min-w-0 flex-1 justify-center">
                    <button
                      ref={moreButtonRef}
                      type="button"
                      onClick={() => setMoreOpen((v) => !v)}
                      className={cn(tabClass, active ? 'text-text' : 'text-text-muted')}
                      aria-label={
                        chatUnread + notificationUnread > 0
                          ? `${item.name}, ${chatUnread + notificationUnread} sin leer`
                          : item.name
                      }
                      aria-expanded={moreOpen}
                    >
                      <span className="relative">
                        <span
                          className={cn(
                            'member-bottom-nav-tab-icon',
                            (active || moreOpen) && 'member-bottom-nav-tab-icon--active'
                          )}
                        >
                          <item.icon className="operate-icon h-5 w-5" aria-hidden />
                        </span>
                        {chatUnread + notificationUnread > 0 && (
                          <span className="member-bottom-nav-unread">
                            {chatUnread + notificationUnread > 99
                              ? '99+'
                              : chatUnread + notificationUnread}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ) : (
                  <li key={item.name} className="flex min-w-0 flex-1 justify-center">
                    <Link
                      to={item.href}
                      {...routePrefetchHandlers(item.href)}
                      className={cn(tabClass, active ? 'text-text' : 'text-text-muted')}
                      aria-label={item.name}
                      aria-current={active ? 'page' : undefined}
                    >
                      <span className="relative">
                        <span
                          className={cn(
                            'member-bottom-nav-tab-icon',
                            active && 'member-bottom-nav-tab-icon--active'
                          )}
                        >
                          <item.icon className="operate-icon h-5 w-5" aria-hidden />
                        </span>
                        {item.showUnreadBadge && chatUnread > 0 && (
                          <span className="member-bottom-nav-unread">
                            {chatUnread > 99 ? '99+' : chatUnread}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );

              return insertFabSlot ? (
                <Fragment key={`slot-${item.name}`}>
                  <li className="w-[var(--member-fab-size)] shrink-0" aria-hidden />
                  {tab}
                </Fragment>
              ) : (
                tab
              );
            })}
          </ul>
        </div>
      </nav>

      <LogoutConfirmModal {...logoutConfirmProps} />
    </>
  );
}
