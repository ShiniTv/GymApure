import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router';
import { LogOut } from 'lucide-react';
import clsx from 'clsx';
import { useChatUnreadQuery } from '../../hooks/queries/useChatQuery';
import { routePrefetchHandlers } from '../../lib/routePrefetch';
import { LogoutConfirmModal, useLogoutConfirm } from '../LogoutConfirmModal';
import { Sheet } from '../ui';
import type {
  StaffBottomNavMoreItem,
  StaffBottomNavTab,
} from '../../config/navigation/bottomNavTypes';

interface StaffBottomNavProps {
  ariaLabel: string;
  primaryTabs: StaffBottomNavTab[];
  moreItems: StaffBottomNavMoreItem[];
  /** CSS variable name without var(), e.g. --trainer-nav-stack */
  navStackVar: string;
  isPrimaryTabActive: (pathname: string, search: string, tab: StaffBottomNavTab) => boolean;
  isMoreItemActive: (pathname: string, search: string, href: string) => boolean;
  isMoreTabActive: (pathname: string, search: string) => boolean;
  /** Optional greeting under the sheet title (tile layout). */
  greetingName?: string;
  greetingSubtitle?: string;
}

export function StaffBottomNav({
  ariaLabel,
  primaryTabs,
  moreItems,
  navStackVar,
  isPrimaryTabActive,
  isMoreItemActive,
  isMoreTabActive,
  greetingName,
  greetingSubtitle = 'Atajos y cuenta',
}: StaffBottomNavProps) {
  const location = useLocation();
  const { data: chatUnread = 0 } = useChatUnreadQuery(true);
  const { requestLogout, logoutConfirmProps } = useLogoutConfirm();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const sheetBottomStyle = {
    bottom: `calc(var(${navStackVar}) + env(safe-area-inset-bottom, 0px))`,
  } as const;

  const closeMore = () => {
    setMoreOpen(false);
    requestAnimationFrame(() => moreButtonRef.current?.focus());
  };

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname, location.search]);

  const moreTabHighlighted = isMoreTabActive(location.pathname, location.search) || moreOpen;

  const moreSections = useMemo(() => {
    const sections: { label: string; items: StaffBottomNavMoreItem[] }[] = [];
    for (const item of moreItems) {
      const label = item.section ?? 'Más';
      const last = sections[sections.length - 1];
      if (last?.label === label) {
        last.items.push(item);
      } else {
        sections.push({ label, items: [item] });
      }
    }
    return sections;
  }, [moreItems]);

  const moreMenuBadgeCount = useMemo(
    () => moreItems.reduce((total, item) => total + (item.badgeCount ?? 0), 0),
    [moreItems]
  );

  const initials = greetingName
    ? greetingName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => (p[0] ? p[0].toUpperCase() : ''))
        .join('') || '?'
    : null;

  return (
    <>
      <Sheet
        open={moreOpen}
        onClose={closeMore}
        title={greetingName ? undefined : 'Más opciones'}
        ariaLabel="Más opciones"
        closeLabel="Cerrar menú"
        side="bottom"
        panelStyle={sheetBottomStyle}
        zIndex={46}
        className="px-3"
        cardClassName="mx-auto max-w-md shadow-lg"
        scrollable
        showHandle
        compact
      >
        {greetingName && (
          <div className="animate-in fade-in slide-in-from-bottom-1 mb-2.5 flex items-center gap-2.5 duration-200">
            <div
              className="bg-brand/15 text-brand flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              aria-hidden
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-text truncate text-sm font-semibold">
                Hola, {greetingName.split(/\s+/)[0]}
              </p>
              <p className="text-text-muted text-[11px]">{greetingSubtitle}</p>
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          {moreSections.map((section) => (
            <div key={section.label} className="animate-in fade-in duration-200">
              <p className="text-text-muted mb-1 px-0.5 text-[10px] font-semibold tracking-wide uppercase">
                {section.label}
              </p>
              <ul className="grid grid-cols-2 gap-1.5">
                {section.items.map((item) => {
                  const itemActive = isMoreItemActive(
                    location.pathname,
                    location.search,
                    item.href
                  );
                  const unreadLabel =
                    item.showUnreadBadge && chatUnread > 0
                      ? chatUnread === 1
                        ? '1 sin leer'
                        : `${chatUnread > 99 ? '99+' : chatUnread} sin leer`
                      : null;
                  const itemBadge = item.badgeCount ?? 0;
                  const badgeLabel =
                    itemBadge > 0
                      ? itemBadge === 1
                        ? '1 pendiente'
                        : `${itemBadge > 99 ? '99+' : itemBadge} pendientes`
                      : null;
                  return (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        {...routePrefetchHandlers(item.href)}
                        onClick={closeMore}
                        className={clsx(
                          'tap-feedback relative flex min-h-[3.75rem] touch-manipulation flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center transition-[transform,opacity,background-color] duration-150',
                          itemActive
                            ? 'border-border bg-surface-overlay text-text'
                            : 'border-border/60 text-text-secondary hover:bg-surface-overlay/60 hover:text-text bg-transparent'
                        )}
                        aria-current={itemActive ? 'page' : undefined}
                        aria-label={
                          unreadLabel
                            ? `${item.name}, ${unreadLabel}`
                            : badgeLabel
                              ? `${item.name}, ${badgeLabel}`
                              : item.name
                        }
                      >
                        {itemActive ? (
                          <span
                            className="bg-text-muted absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full"
                            aria-hidden
                          />
                        ) : null}
                        <span className="relative inline-flex">
                          <item.icon className="h-5 w-5" aria-hidden />
                          {item.showUnreadBadge && chatUnread > 0 && (
                            <span className="ring-surface absolute -top-1 -right-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-none font-bold text-white tabular-nums ring-2">
                              {chatUnread > 99 ? '99+' : chatUnread}
                            </span>
                          )}
                          {!item.showUnreadBadge && itemBadge > 0 ? (
                            <span className="ring-surface absolute -top-1 -right-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] leading-none font-bold text-white tabular-nums ring-2">
                              {itemBadge > 99 ? '99+' : itemBadge}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-[11px] leading-tight font-semibold">{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-border-subtle mt-2.5 border-t pt-1.5">
          <button
            type="button"
            onClick={() => {
              closeMore();
              requestLogout();
            }}
            className="tap-feedback flex min-h-10 w-full touch-manipulation items-center justify-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-medium text-red-600 transition-[background-color,transform,opacity] duration-150 hover:bg-red-500/10 dark:text-red-400"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      </Sheet>

      <div className="member-bottom-nav pointer-events-none fixed right-0 bottom-0 left-0 z-50 px-4 lg:hidden">
        <nav
          className="member-bottom-nav-pill pointer-events-auto relative mx-auto max-w-md"
          aria-label={ariaLabel}
        >
          <ul className="flex items-stretch justify-around px-1.5 py-1.5">
            {primaryTabs.map((item) => {
              const active =
                item.action === 'more'
                  ? moreTabHighlighted
                  : isPrimaryTabActive(location.pathname, location.search, item);

              if (item.action === 'more') {
                return (
                  <li key={item.name} className="flex min-w-0 flex-1 justify-center">
                    <button
                      ref={moreButtonRef}
                      type="button"
                      onClick={() => setMoreOpen((open) => !open)}
                      className={clsx(
                        'tap-feedback inline-flex min-h-[var(--touch-min)] w-full max-w-[4.5rem] touch-manipulation flex-col items-center justify-center rounded-xl px-0.5 transition-[color,transform,opacity] duration-150',
                        active ? 'text-text' : 'text-text-muted'
                      )}
                      aria-label={
                        moreMenuBadgeCount > 0
                          ? `${item.name}, ${moreMenuBadgeCount > 99 ? '99+' : moreMenuBadgeCount} pendientes`
                          : item.name
                      }
                      aria-expanded={moreOpen}
                      aria-haspopup="dialog"
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
                        {moreMenuBadgeCount > 0 ? (
                          <span className="ring-surface absolute -top-1 -right-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] leading-none font-bold text-white tabular-nums ring-2">
                            {moreMenuBadgeCount > 99 ? '99+' : moreMenuBadgeCount}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              }

              return (
                <li key={item.name} className="flex min-w-0 flex-1 justify-center">
                  <Link
                    to={item.href}
                    {...routePrefetchHandlers(item.href)}
                    className={clsx(
                      'tap-feedback inline-flex min-h-[var(--touch-min)] w-full max-w-[4.5rem] touch-manipulation flex-col items-center justify-center rounded-xl px-0.5 transition-[color,transform,opacity] duration-150',
                      active ? 'text-text' : 'text-text-muted'
                    )}
                    aria-label={
                      item.showUnreadBadge && chatUnread > 0
                        ? `${item.name}, ${chatUnread > 99 ? '99+' : chatUnread} sin leer`
                        : item.name
                    }
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
                        <span className="ring-surface absolute -top-1 -right-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-none font-bold text-white tabular-nums ring-2">
                          {chatUnread > 99 ? '99+' : chatUnread}
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
