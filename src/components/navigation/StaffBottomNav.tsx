import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
    moreButtonRef.current?.focus();
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

  const initials = greetingName
    ? greetingName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
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
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                Hola, {greetingName.split(/\s+/)[0]}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{greetingSubtitle}</p>
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          {moreSections.map((section) => (
            <div key={section.label} className="animate-in fade-in duration-200">
              <p className="mb-1 px-0.5 text-[10px] font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
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
                  return (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        {...routePrefetchHandlers(item.href)}
                        onClick={closeMore}
                        className={clsx(
                          'relative flex min-h-[3.75rem] touch-manipulation flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center transition-transform active:scale-[0.98]',
                          itemActive
                            ? 'border-brand/40 bg-brand/10 text-brand'
                            : 'border-zinc-200/70 bg-transparent text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-800/50'
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
                            <span className="absolute -top-1 -right-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-none font-bold text-white tabular-nums ring-2 ring-white dark:ring-zinc-950">
                              {chatUnread > 99 ? '99+' : chatUnread}
                            </span>
                          )}
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

        <div className="mt-2.5 border-t border-zinc-100 pt-1.5 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => {
              closeMore();
              requestLogout();
            }}
            className="flex min-h-10 w-full touch-manipulation items-center justify-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-500/10 active:scale-[0.99] dark:text-red-400"
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
                        'inline-flex min-h-[var(--touch-min)] w-full max-w-[4.25rem] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 transition-colors',
                        active ? 'text-brand' : 'text-zinc-500 dark:text-zinc-400'
                      )}
                      aria-label={item.name}
                      aria-expanded={moreOpen}
                      aria-haspopup="dialog"
                    >
                      <span
                        className={clsx(
                          'member-bottom-nav-tab-icon',
                          active && 'member-bottom-nav-tab-icon--active'
                        )}
                      >
                        <item.icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="max-w-full truncate text-[9px] leading-none font-semibold tracking-tight">
                        {item.name}
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
                      'inline-flex min-h-[var(--touch-min)] w-full max-w-[4.25rem] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 transition-colors',
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
                        <span className="absolute -top-1 -right-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-none font-bold text-white tabular-nums ring-2 ring-white dark:ring-zinc-950">
                          {chatUnread > 99 ? '99+' : chatUnread}
                        </span>
                      )}
                    </span>
                    <span className="max-w-full truncate text-[9px] leading-none font-semibold tracking-tight">
                      {item.name}
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
