import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, CheckCircle2 } from 'lucide-react';
import {
  PageHeader,
  FilterChips,
  Button,
  PaginationBar,
  EmptyState,
  Skeleton,
} from '../components/ui';
import { useNotificationItems } from '../hooks/useNotificationItems';
import {
  useNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '../hooks/queries/useNotificationsQuery';
import { mapPersistedToItem } from '../lib/notifications/types';
import type { NotificationItem } from '../lib/notifications/types';
import { formatNotificationTime } from '../components/notifications/NotificationPanel';
import { NotificationItemRow } from '../components/notifications/NotificationItemRow';

export default function Notifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const unreadOnly = filter === 'unread';

  const {
    liveItems,
    unreadPersisted,
    isLoading: itemsLoading,
  } = useNotificationItems({
    skipPanel: true,
  });
  const { data, isLoading: listLoading } = useNotificationsQuery(page, unreadOnly);
  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();

  const persistedItems = (data?.items ?? []).map(mapPersistedToItem);
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const hasLive = liveItems.length > 0;
  const hasPersisted = persistedItems.length > 0;
  const isEmpty = !hasLive && !hasPersisted;
  const isLoading = itemsLoading || listLoading;

  const handleActivate = (item: NotificationItem) => {
    if (item.source === 'persisted' && item.notificationId != null) {
      const go = () => void navigate(item.href);
      if (item.readAt) {
        go();
        return;
      }
      void markRead.mutateAsync(item.notificationId).finally(go);
      return;
    }
    void navigate(item.href);
  };

  return (
    <div className="page-stack-tight mx-auto w-full max-w-5xl">
      <PageHeader
        compact
        showTitleOnMobile
        title="Notificaciones"
        subtitle="Novedades y alertas que requieren atención"
        action={
          unreadPersisted > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void markAllRead.mutateAsync()}
              disabled={markAllRead.isPending}
            >
              {markAllRead.isPending ? 'Marcando…' : 'Marcar novedades leídas'}
            </Button>
          ) : undefined
        }
      />

      <FilterChips
        className="w-fit max-w-full"
        value={filter}
        onChange={(value) => {
          setFilter(value as 'all' | 'unread');
          setPage(1);
        }}
        options={[
          { value: 'all', label: 'Todas' },
          { value: 'unread', label: 'Sin leer', count: unreadPersisted },
        ]}
      />

      {isLoading && isEmpty ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={filter === 'unread' && !hasLive ? CheckCircle2 : Bell}
          title={
            filter === 'unread' && !hasLive ? 'Sin novedades pendientes' : 'Sin notificaciones'
          }
          description={
            filter === 'unread' && !hasLive
              ? 'Ya leíste todas tus novedades guardadas.'
              : 'Cuando haya novedades o alertas aparecerán aquí.'
          }
        />
      ) : (
        <div className="space-y-4">
          {hasLive && (
            <section>
              <h2 className="mb-2 text-[11px] font-bold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
                Requiere atención
              </h2>
              <ul className="space-y-2">
                {liveItems.map((item) => (
                  <li key={item.id}>
                    <NotificationItemRow item={item} onActivate={handleActivate} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {hasPersisted && (
            <section>
              <h2 className="mb-2 text-[11px] font-bold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
                Novedades
              </h2>
              <ul className="space-y-2">
                {persistedItems.map((item) => (
                  <li key={item.id}>
                    <NotificationItemRow
                      item={item}
                      onActivate={handleActivate}
                      showTimestamp
                      formatTime={formatNotificationTime}
                    />
                  </li>
                ))}
              </ul>
              {total > limit && (
                <PaginationBar
                  page={page}
                  pageSize={limit}
                  total={total}
                  onPageChange={setPage}
                  label="novedades"
                />
              )}
            </section>
          )}

          {filter === 'unread' && !hasPersisted && hasLive && (
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              Las alertas activas se ocultan cuando se resuelven en su pantalla correspondiente.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
