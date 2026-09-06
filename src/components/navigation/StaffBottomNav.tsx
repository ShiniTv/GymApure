import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router';
import { LogOut, Moon, Sun } from 'lucide-react';
import clsx from 'clsx';
import { useChatUnreadQuery } from '../../hooks/queries/useChatQuery';
import { useNotificationUnreadQuery } from '../../hooks/queries/useNotificationsQuery';
import { useTheme } from '../../context/ThemeContext';
import { routePrefetchHandlers } from '../../lib/routePrefetch';
import { LogoutConfirmModal, useLogoutConfirm } from '../LogoutConfirmModal';
import { InstallPrompt } from '../InstallPrompt';
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
  const { theme, toggleTheme } = useTheme();
  const { data: chatUnread = 0 } = useChatUnreadQuery(true);
  const { data: notificationUnread = 0 } = useNotificationUnreadQuery(true);
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
  }, [location.pathname]);

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

  const moreMenuBadgeCount = useMemo(() => {
    const pending = moreItems.reduce((total, item) => total + (item.badgeCount ?? 0), 0);
    const hasNotifItem = moreItems.some((item) => item.showNotificationBadge);
    return pending + (hasNotifItem ? notificationUnread : 0);
  }, [moreItems, notificationUnread]);

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
          <div className="mb-2 flex items-center gap-2">
            <div
              className="bg-brand/15 text-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-bold"
              aria-hidden
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-text truncate text-[0.8125rem] font-semibold tracking-[-0.014em]">
                Hola, {greetingName.split(/\s+/)[0]}
              </p>
              <p className="text-text-muted text-[0.6875rem] leading-tight">{greetingSubtitle}</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {moreSections.map((section) => (
            <div key={section.label}>
              <p className="text-text-muted mb-1 px-0.5 text-[0.6875rem] font-semibold tracking-[-0.01em]">
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
                      : item.showNotificationBadge && notificationUnread > 0
                        ? notificationUnread === 1
                          ? '1 sin leer'
                          : `${notificationUnread > 99 ? '99+' : notificationUnread} sin leer`
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
                          'tap-feedback relative flex h-[3.5rem] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-[var(--radius-card)] border px-1.5 py-1.5 text-center transition-colors',
                          itemActive
                            ? 'border-border bg-surface-raised text-text'
                            : 'border-border/60 text-text-secondary hover:bg-surface-raised/70 hover:text-text bg-transparent'
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
                            className="bg-brand absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full"
                            aria-hidden
                          />
                        ) : null}
                        <span className="relative inline-flex">
                          <item.icon className="operate-icon h-4 w-4" aria-hidden />
                          {item.showUnreadBadge && chatUnread > 0 && (
                            <span className="ring-surface bg-danger text-small absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[0.625rem] leading-none font-bold text-white tabular-nums ring-2">
                              {chatUnread > 99 ? '99+' : chatUnread}
                            </span>
                          )}
                          {item.showNotificationBadge && notificationUnread > 0 && (
                            <span className="ring-surface bg-danger text-small absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[0.625rem] leading-none font-bold text-white tabular-nums ring-2">
                              {notificationUnread > 99 ? '99+' : notificationUnread}
                            </span>
                          )}
                          {!item.showUnreadBadge && !item.showNotificationBadge && itemBadge > 0 ? (
                            <span className="ring-surface text-small absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-0.5 text-[0.625rem] leading-none font-bold text-white tabular-nums ring-2">
                              {itemBadge > 99 ? '99+' : itemBadge}
                            </span>
                          ) : null}
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
                          <item.icon className="operate-icon h-5 w-5" aria-hidden />
                        </span>
                        {moreMenuBadgeCount > 0 ? (
                          <span className="ring-surface text-small absolute -top-1 -right-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-amber-500 px-1 leading-none font-bold text-white tabular-nums ring-2">
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
                        <item.icon className="operate-icon h-5 w-5" aria-hidden />
                      </span>
                      {item.showUnreadBadge && chatUnread > 0 && (
                        <span className="ring-surface bg-danger text-small absolute -top-1 -right-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-1 leading-none font-bold text-white tabular-nums ring-2">
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
