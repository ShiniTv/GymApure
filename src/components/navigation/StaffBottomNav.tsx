import { useState, useRef, useEffect, Fragment, useCallback, useMemo } from 'react';
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
  /** When set with onToggleFavorite, Más rows show a pin control (list layout). */
  favoriteHrefs?: string[];
  onToggleFavorite?: (href: string) => void;
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
  favoriteHrefs,
  onToggleFavorite,
  greetingName,
  greetingSubtitle = 'Atajos y cuenta',
}: StaffBottomNavProps) {
  const location = useLocation();
  const { data: chatUnread = 0 } = useChatUnreadQuery(true);
  const { requestLogout, logoutConfirmProps } = useLogoutConfirm();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const favoritesEnabled = Boolean(onToggleFavorite);
  /** Tile grid like member Más — list kept for admin favorites. */
  const useTiles = !favoritesEnabled;

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
        title="Más opciones"
        closeLabel="Cerrar menú"
        side="bottom"
        panelStyle={sheetBottomStyle}
        zIndex={46}
        className="px-3"
        cardClassName="mx-auto max-w-md shadow-lg"
        scrollable={favoritesEnabled}
        showHandle
        compact
      >
        {useTiles ? (
          <>
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
                              'relative flex min-h-[3.75rem] touch-manipulation flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center transition-transform active:scale-[0.98]',
                              itemActive
                                ? 'bg-brand/10 text-brand ring-brand/30 ring-1'
                                : 'bg-zinc-50/80 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800/40 dark:text-zinc-200 dark:hover:bg-zinc-800/70'
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
                                <span className="bg-brand absolute -top-1 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] font-bold text-white">
                                  {chatUnread > 9 ? '9+' : chatUnread}
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] leading-tight font-semibold">
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
          </>
        ) : (
          <>
            <ul className="space-y-0.5">
              {moreItems.map((item, index) => {
                const itemActive = isMoreItemActive(location.pathname, location.search, item.href);
                const prevSection = index > 0 ? moreItems[index - 1]?.section : undefined;
                const showSection = Boolean(item.section && item.section !== prevSection);
                const isFavorite = favoriteHrefs?.includes(item.href) ?? false;
                return (
                  <Fragment key={item.href}>
                    {showSection && (
                      <li className="px-2.5 pt-2 pb-0.5 first:pt-0" aria-hidden={false}>
                        <p className="text-[10px] font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
                          {item.section}
                        </p>
                      </li>
                    )}
                    <li className="flex items-center gap-0.5">
                      <Link
                        to={item.href}
                        {...routePrefetchHandlers(item.href)}
                        onClick={closeMore}
                        className={clsx(
                          'flex min-h-10 min-w-0 flex-1 touch-manipulation items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-colors',
                          itemActive
                            ? 'bg-brand/10 text-brand'
                            : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/60'
                        )}
                        aria-current={itemActive ? 'page' : undefined}
                      >
                        <span
                          className={clsx(
                            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                            itemActive
                              ? 'bg-brand/15 text-brand'
                              : 'text-zinc-500 dark:text-zinc-400'
                          )}
                        >
                          <item.icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="flex-1 truncate">{item.name}</span>
                        {item.showUnreadBadge && chatUnread > 0 && (
                          <span className="bg-brand flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white">
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
                          <Star
                            className={clsx('h-4 w-4', isFavorite && 'fill-current')}
                            aria-hidden
                          />
                        </button>
                      )}
                    </li>
                  </Fragment>
                );
              })}
            </ul>
            <div className="mt-1.5 border-t border-zinc-100 pt-1.5 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  closeMore();
                  requestLogout();
                }}
                className="flex min-h-10 w-full touch-manipulation items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-500/90 dark:text-red-400">
                  <LogOut className="h-4 w-4" aria-hidden />
                </span>
                <span className="flex-1 truncate text-left">Cerrar sesión</span>
              </button>
            </div>
          </>
        )}
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
                        'inline-flex min-h-[var(--touch-min)] min-w-[var(--touch-min)] touch-manipulation items-center justify-center rounded-xl px-1 transition-colors',
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
                      'inline-flex min-h-[var(--touch-min)] min-w-[var(--touch-min)] touch-manipulation items-center justify-center rounded-xl px-1 transition-colors',
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
