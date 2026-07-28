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
        'w-full rounded-xl border px-2.5 py-2.5 text-left transition-colors sm:rounded-lg sm:py-2',
        selected
          ? 'border-brand/40 bg-brand/5'
          : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
      )}
    >
      <div className="flex items-start gap-2.5">
        <Avatar
          src={item.member_avatar}
          name={item.member_name}
          size="sm"
          className="mt-0.5 !h-9 !w-9 shrink-0 !text-[10px] !ring-1"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
              {item.member_name}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              {listTime ? (
                <span className="text-[10px] text-zinc-400 tabular-nums dark:text-zinc-500">
                  {listTime}
                </span>
              ) : null}
              {item.unread_count > 0 ? (
                <span className="nav-badge brand-solid">
                  {item.unread_count > 99 ? '99+' : item.unread_count}
                </span>
              ) : null}
            </div>
          </div>
          {item.member_cedula ? (
            <p className="mt-0.5 truncate text-[10px] text-zinc-400 dark:text-zinc-500">
              {item.member_cedula}
              {item.membership_name ? ` · ${item.membership_name}` : ''}
            </p>
          ) : item.membership_name ? (
            <p className="mt-0.5 truncate text-[10px] text-zinc-400 dark:text-zinc-500">
              {item.membership_name}
            </p>
          ) : null}
          {item.last_message_preview ? (
            <p
              className={clsx(
                'mt-1 truncate text-xs',
                item.unread_count > 0
                  ? 'font-medium text-zinc-700 dark:text-zinc-200'
                  : 'text-zinc-500 dark:text-zinc-400'
              )}
            >
              {item.last_message_preview}
            </p>
          ) : null}
          {expiryBadge ? (
            <Badge className={clsx('mt-1.5', expiryBadge.className)}>{expiryBadge.label}</Badge>
          ) : null}
        </div>
      </div>
    </button>
  );
});
