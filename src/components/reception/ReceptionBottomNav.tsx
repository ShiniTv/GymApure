import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import clsx from 'clsx';
import { useChatUnreadQuery } from '../../hooks/queries/useChatQuery';
import { LogoutConfirmModal, useLogoutConfirm } from '../LogoutConfirmModal';
import {
  RECEPTION_PRIMARY_TABS,
  RECEPTION_MORE_ITEMS,
  isReceptionBottomNavActive,
} from '../../config/navigation/receptionBottomNav';

export function ReceptionBottomNav() {
  const location = useLocation();
  const { data: chatUnread = 0 } = useChatUnreadQuery(true);
  const { requestLogout, logoutConfirmProps } = useLogoutConfirm();
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname, location.search]);

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

  useEffect(() => {
    if (!moreOpen || !sheetRef.current) return;
    const sheet = sheetRef.current;
    const focusables = sheet.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    requestAnimationFrame(() => first?.focus());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMoreOpen(false);
        moreButtonRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab' || focusables.length === 0) return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [moreOpen]);

  const isMoreItemActive = RECEPTION_MORE_ITEMS.some(
    (item) => location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
  );

  const sheetBottom = 'bottom-[calc(4.75rem+env(safe-area-inset-bottom))]';

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
          'fixed right-0 left-0 z-[46] px-4 transition-transform duration-200 ease-out lg:hidden',
          moreOpen
            ? clsx('translate-y-0', sheetBottom)
            : 'pointer-events-none bottom-0 translate-y-full'
        )}
        role="dialog"
        aria-modal={moreOpen}
        aria-label="Más opciones"
        aria-hidden={!moreOpen}
      >
        <div className="mb-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center justify-between px-1 py-1">
            <p className="text-sm font-bold text-zinc-900 dark:text-white">Más opciones</p>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-1">
            {RECEPTION_MORE_ITEMS.map((item) => {
              const itemActive =
                location.pathname === item.href ||
                (item.href.startsWith('/check-in') && location.pathname === '/check-in');
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    onClick={() => setMoreOpen(false)}
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
                        itemActive
                          ? 'bg-brand text-white'
                          : 'text-brand bg-zinc-100 dark:bg-zinc-800'
                      )}
                    >
                      <item.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="flex-1 truncate">{item.name}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
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
        </div>
      </div>

      <div className="member-bottom-nav pointer-events-none fixed right-0 bottom-0 left-0 z-50 px-4 lg:hidden">
        <nav
          className="member-bottom-nav-pill pointer-events-auto relative mx-auto max-w-md"
          aria-label="Navegación recepción"
        >
          <ul className="flex items-center justify-around px-2 py-2">
            {RECEPTION_PRIMARY_TABS.map((item) => {
              const active =
                item.action === 'more'
                  ? isMoreItemActive || moreOpen
                  : isReceptionBottomNavActive(location.pathname, item.href);

              if (item.action === 'more') {
                return (
                  <li key={item.name} className="flex flex-1 justify-center">
                    <button
                      ref={moreButtonRef}
                      type="button"
                      onClick={() => setMoreOpen((open) => !open)}
                      className={clsx(
                        'inline-flex min-h-[var(--touch-min)] min-w-[var(--touch-min)] touch-manipulation items-center justify-center rounded-xl transition-colors',
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
