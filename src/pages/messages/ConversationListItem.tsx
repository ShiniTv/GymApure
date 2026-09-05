import { memo } from 'react';
import clsx from 'clsx';
import { Avatar, Badge } from '../../components/ui';
import { getExpiryBadgeInfo } from '../../lib/expiryUtils';
import type { ChatConversationListItem } from '../../hooks/queries/useChatQuery';
import { formatListTime } from './chatFormat';

export const ConversationListItem = memo(function ConversationListItem({
  item,
  selected,
  alertDays,
  onSelect,
}: {
  item: ChatConversationListItem;
  selected: boolean;
  alertDays: number;
  onSelect: () => void;
}) {
  const expiryBadge = getExpiryBadgeInfo(item.days_remaining, alertDays);
  const listTime = item.last_message_at ? formatListTime(item.last_message_at) : '';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'tap-feedback border-border/60 flex w-full items-start gap-3 border-b px-3 py-2.5 text-left transition-colors last:border-b-0',
        selected ? 'bg-surface-raised/80' : 'hover:bg-surface-raised/80'
      )}
    >
      <Avatar
        src={item.member_avatar}
        name={item.member_name}
        size="sm"
        className="!text-small mt-0.5 !h-9 !w-9 shrink-0 !ring-1"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-text truncate text-sm font-medium tracking-[-0.011em]">
            {item.member_name}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {listTime ? (
              <span className="text-text-muted text-small tabular-nums">{listTime}</span>
            ) : null}
            {item.unread_count > 0 ? (
              <span className="nav-badge brand-solid">
                {item.unread_count > 99 ? '99+' : item.unread_count}
              </span>
            ) : null}
          </div>
        </div>
        {item.member_cedula ? (
          <p className="text-text-muted text-small mt-0.5 truncate">
            {item.member_cedula}
            {item.membership_name ? ` · ${item.membership_name}` : ''}
          </p>
        ) : item.membership_name ? (
          <p className="text-text-muted text-small mt-0.5 truncate">{item.membership_name}</p>
        ) : null}
        {item.last_message_preview ? (
          <p
            className={clsx(
              'mt-1 truncate text-xs',
              item.unread_count > 0 ? 'text-text font-medium' : 'text-text-muted'
            )}
          >
            {item.last_message_preview}
          </p>
        ) : null}
        {expiryBadge ? (
          <Badge className={clsx('mt-1.5', expiryBadge.className)}>{expiryBadge.label}</Badge>
        ) : null}
      </div>
    </button>
  );
});
