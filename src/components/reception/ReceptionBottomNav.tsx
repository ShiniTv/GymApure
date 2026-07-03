import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useChatUnreadQuery } from '../../hooks/queries/useChatQuery';
import {
  RECEPTION_PRIMARY_TABS,
  isReceptionBottomNavActive,
} from '../../config/navigation/receptionBottomNav';

export function ReceptionBottomNav() {
  const location = useLocation();
  const { data: chatUnread = 0 } = useChatUnreadQuery(true);

  return (
    <div className="member-bottom-nav pointer-events-none fixed right-0 bottom-0 left-0 z-50 px-4 lg:hidden">
      <nav
        className="member-bottom-nav-pill pointer-events-auto relative mx-auto max-w-md"
        aria-label="Navegación recepción"
      >
        <ul className="flex items-center justify-around px-3 py-2">
          {RECEPTION_PRIMARY_TABS.map((item) => {
            const active = isReceptionBottomNavActive(location.pathname, item.href);
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
  );
}
