import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { expiryBannerClasses } from '../../lib/expiryUtils';
import type { NotificationItem, NotificationSeverity } from '../../lib/notifications/types';

function itemSeverityClasses(severity: NotificationSeverity = 'info') {
  if (severity === 'info') {
    return {
      itemBorder: 'border-border bg-surface-raised',
      text: 'text-text-secondary',
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
          <p className="text-text-muted mt-0.5 text-xs sm:text-sm">{item.description}</p>
        )}
        {showTimestamp && item.createdAt && formatTime && (
          <p className="text-text-muted text-small mt-2">{formatTime(item.createdAt)}</p>
        )}
      </div>
      {item.count != null && item.count > 1 && (
        <span className="bg-brand text-small flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 font-bold text-white">
          {item.count > 99 ? '99+' : item.count}
        </span>
      )}
      <ChevronRight className="text-text-muted h-4 w-4 shrink-0" aria-hidden />
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
