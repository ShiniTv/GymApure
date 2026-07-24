import { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { Bell } from 'lucide-react';
import clsx from 'clsx';
import { useNotificationItems } from '../../hooks/useNotificationItems';
import { formatNotificationBadgeCount } from '../../lib/notifications/types';
import { NotificationPanel } from './NotificationPanel';

const defaultBtnClass =
  'relative inline-flex items-center justify-center h-11 w-11 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors touch-manipulation';

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
            ? 'relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800'
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
                  ? 'bg-brand -top-1.5 -right-2 h-4 min-w-4 px-0.5 text-[9px] text-white ring-white dark:text-zinc-900 dark:ring-zinc-900'
                  : 'bg-brand -top-2 -right-2.5 h-[1.125rem] min-w-[1.125rem] px-1 text-[10px] leading-none text-white shadow-sm ring-white dark:text-zinc-900 dark:ring-zinc-950'
              )}
            >
              {badgeLabel}
            </span>
          )}
        </span>
      </button>

      <NotificationPanel
        open={open}
        onClose={() => setOpen(false)}
        persistedItems={persistedItems}
        liveItems={liveItems}
        isLoading={isLoading}
      />
    </>
  );
}
