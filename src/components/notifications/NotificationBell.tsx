import { useState, useEffect, lazy, Suspense } from 'react';
import { useLocation } from 'react-router';
import { Bell } from 'lucide-react';
import clsx from 'clsx';
import { useNotificationItems } from '../../hooks/useNotificationItems';
import { formatNotificationBadgeCount } from '../../lib/notifications/types';

const NotificationPanel = lazy(() =>
  import('./NotificationPanel').then((m) => ({ default: m.NotificationPanel }))
);
const defaultBtnClass =
  'text-text-muted hover:bg-surface-raised relative inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-lg transition-colors';

interface NotificationBellProps {
  className?: string;
  /** Smaller hit target for desktop sidebar */
  compact?: boolean;
}

export function NotificationBell({ className, compact }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { persistedItems, liveItems, badgeCount, isLoading } = useNotificationItems();
  const badgeLabel = formatNotificationBadgeCount(badgeCount);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  const ariaLabel = badgeCount > 0 ? `Notificaciones, ${badgeCount} sin leer` : 'Notificaciones';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={clsx(
          compact
            ? 'text-text-muted hover:bg-surface-raised relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors'
            : defaultBtnClass,
          className
        )}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Notificaciones"
      >
        <span className="relative inline-flex">
          <Bell className={compact ? 'h-4 w-4' : 'h-[1.125rem] w-[1.125rem]'} aria-hidden />
          {badgeLabel && (
            <span
              className={clsx(
                'absolute flex items-center justify-center rounded-full font-bold tabular-nums ring-2',
                compact
                  ? 'bg-brand dark:text-bg dark:ring-bg text-small -top-1.5 -right-2 h-4 min-w-4 px-0.5 text-white ring-white'
                  : 'bg-brand dark:text-bg dark:ring-bg text-small -top-2 -right-2.5 h-[1.125rem] min-w-[1.125rem] px-1 leading-none text-white shadow-sm ring-white'
              )}
            >
              {badgeLabel}
            </span>
          )}
        </span>
      </button>
      {open ? (
        <Suspense fallback={null}>
          <NotificationPanel
            open={open}
            onClose={() => setOpen(false)}
            persistedItems={persistedItems}
            liveItems={liveItems}
            isLoading={isLoading}
          />
        </Suspense>
      ) : null}{' '}
    </>
  );
}
