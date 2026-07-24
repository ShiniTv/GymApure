import { useState, useRef, useEffect, useMemo, Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dumbbell, LogOut } from 'lucide-react';
import { LogoutConfirmModal, useLogoutConfirm } from '../LogoutConfirmModal';
import { Sheet } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useMemberStatsOptional } from '../../context/MemberStatsContext';
import { useChatUnreadQuery } from '../../hooks/queries/useChatQuery';
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

const moreItemClass =
  'relative flex min-h-[4.25rem] touch-manipulation flex-col items-center justify-center gap-1 rounded-card px-2 py-2.5 text-center transition-[transform,opacity,background-color] duration-150 tap-feedback';

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
  const { requestLogout, logoutConfirmProps } = useLogoutConfirm();
  const memberStats = useMemberStatsOptional();
  const { data: chatUnread = 0 } = useChatUnreadQuery(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const { first, initials } = useMemo(() => memberDisplayName(user?.name), [user?.name]);
  const moreSections = useMemo(() => groupMoreItems(MEMBER_MORE_ITEMS), []);

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
        cardClassName="mx-auto max-w-md shadow-lg"
        showHandle
        compact
      >
        <div className="animate-in fade-in slide-in-from-bottom-1 mb-2.5 flex items-center gap-2.5 duration-200">
          <div
            className="bg-brand/15 text-brand flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-[-0.02em] text-text">
              Hola, {first}
            </p>
            <p className="text-[11px] text-text-secondary">Tu cuenta y atajos</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {moreSections.map((section) => (
            <div key={section.label} className="animate-in fade-in duration-200">
              <p className="mb-1 px-0.5 text-[10px] font-semibold tracking-[0.06em] text-text-muted uppercase">
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
                      : null;
                  return (
                    <li
                      key={item.href}
                      className={section.items.length === 1 ? 'col-span-1' : undefined}
                    >
                      <Link
                        to={item.href}
                        {...routePrefetchHandlers(item.href)}
                        onClick={closeMore}
                        className={cn(
                          moreItemClass,
                          itemActive
                            ? 'bg-brand/10 text-brand ring-brand/30 ring-1'
                            : 'bg-surface-overlay/60 text-text hover:bg-surface-overlay'
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
                          <item.icon className="h-5 w-5" aria-hidden />
                          {item.showUnreadBadge && chatUnread > 0 && (
                            <span className="member-bottom-nav-unread">
                              {chatUnread > 99 ? '99+' : chatUnread}
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] leading-tight font-semibold">{item.name}</span>
                        {unreadLabel ? (
                          <span className="text-[9px] leading-none font-medium text-text-muted">
                            {unreadLabel}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-2.5 border-t border-border pt-1.5">
          <button
            type="button"
            onClick={() => {
              closeMore();
              requestLogout();
            }}
            className="text-danger hover:bg-danger/10 flex min-h-10 w-full touch-manipulation items-center justify-center gap-2 rounded-card px-2.5 py-2 text-[13px] font-medium transition-[background-color,transform,opacity] duration-150 tap-feedback"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Cerrar sesión
          </button>
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
            <span className="brand-solid flex h-full w-full items-center justify-center rounded-full shadow-lg ring-2 ring-bg transition-[transform,opacity] duration-150 tap-feedback">
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
                      className={cn(tabClass, active ? 'text-brand' : 'text-text-secondary')}
                      aria-label={
                        chatUnread > 0 ? `${item.name}, ${chatUnread} sin leer` : item.name
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
                          <item.icon className="h-5 w-5" aria-hidden />
                        </span>
                        {chatUnread > 0 && (
                          <span className="member-bottom-nav-unread">
                            {chatUnread > 99 ? '99+' : chatUnread}
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
                      className={cn(tabClass, active ? 'text-brand' : 'text-text-secondary')}
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
                          <item.icon className="h-5 w-5" aria-hidden />
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
