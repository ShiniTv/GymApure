import { useState, useRef, useEffect, Fragment, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Star } from 'lucide-react';
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
  /** When set with onToggleFavorite, Más rows show a pin control. */
  favoriteHrefs?: string[];
  onToggleFavorite?: (href: string) => void;
}

export function StaffBottomNav({
  ariaLabel,
  primaryTabs,
  moreItems,
  navStackVar,
  isPrimaryTabActive,
  isMoreItemActive,
  isMoreTabActive,
  favoriteHrefs,
  onToggleFavorite,
}: StaffBottomNavProps) {
  const location = useLocation();
  const { data: chatUnread = 0 } = useChatUnreadQuery(true);
  const { requestLogout, logoutConfirmProps } = useLogoutConfirm();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const favoritesEnabled = Boolean(onToggleFavorite);

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

  const handleToggleFavorite = useCallback(
    (href: string) => {
      onToggleFavorite?.(href);
    },
    [onToggleFavorite]
  );

  return (
    <>
      <Sheet
        open={moreOpen}
        onClose={closeMore}
        title="Más opciones"
        side="bottom"
        panelStyle={sheetBottomStyle}
        zIndex={46}
        className="px-4"
        scrollable
      >
        <ul className="space-y-1">
          {moreItems.map((item, index) => {
            const itemActive = isMoreItemActive(location.pathname, location.search, item.href);
            const prevSection = index > 0 ? moreItems[index - 1]?.section : undefined;
            const showSection = Boolean(item.section && item.section !== prevSection);
            const isFavorite = favoriteHrefs?.includes(item.href) ?? false;
            return (
              <Fragment key={item.href}>
                {showSection && (
                  <li className="px-3 pt-2 pb-1 first:pt-0" aria-hidden={false}>
                    <p className="text-[10px] font-bold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
                      {item.section}
                    </p>
                  </li>
                )}
                <li className="flex items-center gap-1">
                  <Link
                    to={item.href}
                    {...routePrefetchHandlers(item.href)}
                    onClick={closeMore}
                    className={clsx(
                      'flex min-h-[var(--touch-min)] min-w-0 flex-1 touch-manipulation items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors',
                      itemActive
                        ? 'bg-brand/10 text-brand'
                        : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/60'
                    )}
                    aria-current={itemActive ? 'page' : undefined}
                  >
                    <span
                      className={clsx(
                        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        itemActive
                          ? 'bg-brand text-white'
                          : 'text-brand bg-zinc-100 dark:bg-zinc-800'
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
                  {favoritesEnabled && (
                    <button
                      type="button"
                      className={clsx(
                        'inline-flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-xl transition-colors',
                        isFavorite
                          ? 'text-brand'
                          : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                      )}
                      aria-label={
                        isFavorite ? `Quitar ${item.name} de favoritos` : `Fijar ${item.name}`
                      }
                      aria-pressed={isFavorite}
                      onClick={() => handleToggleFavorite(item.href)}
                    >
                      <Star className={clsx('h-4 w-4', isFavorite && 'fill-current')} aria-hidden />
                    </button>
                  )}
                </li>
              </Fragment>
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
        <nav
          className="member-bottom-nav-pill pointer-events-auto relative mx-auto max-w-md"
          aria-label={ariaLabel}
        >
          <ul className="flex items-center justify-around px-2 py-2">
            {primaryTabs.map((item) => {
              const active =
                item.action === 'more'
                  ? moreTabHighlighted
                  : isPrimaryTabActive(location.pathname, location.search, item);

              if (item.action === 'more') {
                return (
                  <li key={item.name} className="flex flex-1 justify-center">
                    <button
                      ref={moreButtonRef}
                      type="button"
                      onClick={() => setMoreOpen((open) => !open)}
                      className={clsx(
                        'inline-flex min-h-[var(--touch-min)] min-w-[var(--touch-min)] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition-colors',
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
                      <span className="max-w-full truncate text-[9px] leading-none font-semibold">
                        {item.name}
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
                      'inline-flex min-h-[var(--touch-min)] min-w-[var(--touch-min)] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition-colors',
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
                    <span className="max-w-full truncate text-[9px] leading-none font-semibold">
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
