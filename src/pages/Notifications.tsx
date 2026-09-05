import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, CheckCircle2 } from 'lucide-react';
import { FilterChips, Button, PaginationBar, EmptyState, Skeleton } from '../components/ui';
import { OperateHeader, OperatePage } from '../components/operate/OperateChrome';
import { useNotificationItems } from '../hooks/useNotificationItems';
import {
  useNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '../hooks/queries/useNotificationsQuery';
import {
  mapPersistedToItem,
  notificationTypeGroupLabel,
  type NotificationItem,
} from '../lib/notifications/types';
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

  const persistedGroups = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    for (const item of persistedItems) {
      const key = notificationTypeGroupLabel(item.type);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [persistedItems]);

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
    <OperatePage maxWidth="max-w-5xl">
      <OperateHeader
        icon={Bell}
        title="Notificaciones"
        subtitle={
          unreadPersisted > 0
            ? `${unreadPersisted} sin leer`
            : 'Novedades y alertas que requieren atención'
        }
        action={
          unreadPersisted > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              className="min-h-11"
              onClick={() => void markAllRead.mutateAsync()}
              disabled={markAllRead.isPending}
            >
              {markAllRead.isPending ? 'Marcando…' : 'Marcar leídas'}
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
            <Skeleton key={i} className="h-14 w-full rounded-[var(--radius-card)]" />
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
          action={
            filter === 'unread' && !hasLive ? (
              <Button
                size="sm"
                variant="secondary"
                className="min-h-11"
                onClick={() => setFilter('all')}
              >
                Ver todas
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                className="min-h-11"
                onClick={() => void navigate('/panel')}
              >
                Ir al panel
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {hasLive && (
            <section>
              <h2 className="text-text-secondary mb-2 text-sm font-semibold tracking-[-0.01em]">
                Requiere atención
              </h2>
              <ul className="border-border/80 bg-surface overflow-hidden rounded-[var(--radius-card)] border">
                {liveItems.map((item) => (
                  <li key={item.id} className="border-border/60 border-b last:border-b-0">
                    <NotificationItemRow item={item} onActivate={handleActivate} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {hasPersisted && (
            <section className="space-y-4">
              {persistedGroups.map(([groupLabel, items]) => (
                <div key={groupLabel}>
                  <h2 className="text-text-secondary mb-2 text-sm font-semibold tracking-[-0.01em]">
                    {groupLabel}
                  </h2>
                  <ul className="border-border/80 bg-surface overflow-hidden rounded-[var(--radius-card)] border">
                    {items.map((item) => (
                      <li key={item.id} className="border-border/60 border-b last:border-b-0">
                        <NotificationItemRow
                          item={item}
                          onActivate={handleActivate}
                          showTimestamp
                          formatTime={formatNotificationTime}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
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
            <p className="text-text-muted text-center text-xs">
              Las alertas activas se ocultan cuando se resuelven en su pantalla correspondiente.
            </p>
          )}
        </div>
      )}
    </OperatePage>
  );
}
