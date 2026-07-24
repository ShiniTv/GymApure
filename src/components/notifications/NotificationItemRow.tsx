import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { expiryBannerClasses } from '../../lib/expiryUtils';
import type { NotificationItem, NotificationSeverity } from '../../lib/notifications/types';

function itemSeverityClasses(severity: NotificationSeverity = 'info') {
  if (severity === 'info') {
    return {
      itemBorder: 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/30',
      text: 'text-zinc-700 dark:text-zinc-300',
    };
  }
  return expiryBannerClasses(severity);
}

export function NotificationItemRow({
  item,
  onActivate,
  showTimestamp,
  formatTime,
}: {
  item: NotificationItem;
  onActivate: (item: NotificationItem) => void;
  showTimestamp?: boolean;
  formatTime?: (iso: string) => string;
}) {
  const styles = itemSeverityClasses(item.severity);
  const isUnread = item.source === 'persisted' && !item.readAt;

  const content = (
    <>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-start justify-between gap-2">
          <p className={clsx('text-sm font-semibold', styles.text)}>{item.title}</p>
          {isUnread && <span className="bg-brand mt-1 h-2 w-2 shrink-0 rounded-full" aria-hidden />}
        </div>
        {item.description && (
          <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
            {item.description}
          </p>
        )}
        {showTimestamp && item.createdAt && formatTime && (
          <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
            {formatTime(item.createdAt)}
          </p>
        )}
      </div>
      {item.count != null && item.count > 1 && (
        <span className="bg-brand flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white">
          {item.count > 99 ? '99+' : item.count}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
    </>
  );

  const className = clsx(
    'flex min-h-[var(--touch-min)] w-full touch-manipulation items-center gap-3 rounded-xl border px-3 py-3 transition-colors hover:opacity-90',
    styles.itemBorder,
    isUnread && 'ring-brand/20 ring-1'
  );

  if (item.source === 'persisted') {
    return (
      <button type="button" onClick={() => onActivate(item)} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Link to={item.href} onClick={() => onActivate(item)} className={className}>
      {content}
    </Link>
  );
}
