import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader, FilterChips, Button, PaginationBar, EmptyState, Card } from '../components/ui';
import { expiryBannerClasses } from '../lib/expiryUtils';
import { mapPersistedToItem } from '../lib/notifications/types';
import type { NotificationSeverity } from '../lib/notifications/types';
import {
  useNotificationsQuery,
  useNotificationUnreadQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '../hooks/queries/useNotificationsQuery';
import { formatNotificationTime } from '../components/notifications/NotificationPanel';

function severityClasses(severity: NotificationSeverity = 'info') {
  if (severity === 'info') {
    return {
      itemBorder: 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/30',
      text: 'text-zinc-700 dark:text-zinc-300',
    };
  }
  return expiryBannerClasses(severity);
}

export default function Notifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const unreadOnly = filter === 'unread';

  const { data: unreadCount = 0 } = useNotificationUnreadQuery();
  const { data, isLoading } = useNotificationsQuery(page, unreadOnly);
  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();

  const items = (data?.items ?? []).map(mapPersistedToItem);
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;

  const handleOpen = (notificationId: number, href: string, readAt: string | null | undefined) => {
    const go = () => void navigate(href);
    if (readAt) {
      go();
      return;
    }
    void markRead.mutateAsync(notificationId).finally(go);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Notificaciones"
        subtitle="Historial de novedades y alertas del gym"
        showTitleOnMobile
        action={
          unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void markAllRead.mutateAsync()}
              disabled={markAllRead.isPending}
            >
              {markAllRead.isPending ? 'Marcando…' : 'Marcar todas leídas'}
            </Button>
          ) : undefined
        }
      />

      <FilterChips
        fullWidth
        value={filter}
        onChange={(value) => {
          setFilter(value as 'all' | 'unread');
          setPage(1);
        }}
        options={[
          { value: 'all', label: 'Todas' },
          { value: 'unread', label: 'Sin leer', count: unreadCount },
        ]}
      />

      {isLoading && items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Cargando notificaciones…
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={filter === 'unread' ? CheckCircle2 : Bell}
          title={filter === 'unread' ? 'Sin novedades pendientes' : 'Sin notificaciones'}
          description={
            filter === 'unread'
              ? 'Ya leíste todas tus notificaciones.'
              : 'Cuando haya novedades aparecerán aquí.'
          }
        />
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((item) => {
              const styles = severityClasses(item.severity);
              const isUnread = !item.readAt;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() =>
                      item.notificationId != null &&
                      handleOpen(item.notificationId, item.href, item.readAt)
                    }
                    className={clsx(
                      'flex w-full touch-manipulation items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
                      styles.itemBorder,
                      isUnread && 'ring-brand/20 ring-1'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={clsx('text-sm font-semibold', styles.text)}>{item.title}</p>
                        {isUnread && (
                          <span
                            className="bg-brand mt-1 h-2 w-2 shrink-0 rounded-full"
                            aria-hidden
                          />
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                          {item.description}
                        </p>
                      )}
                      {item.createdAt && (
                        <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
                          {formatNotificationTime(item.createdAt)}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>

          {total > limit && (
            <PaginationBar page={page} pageSize={limit} total={total} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
