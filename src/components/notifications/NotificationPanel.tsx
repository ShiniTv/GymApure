import { Link, useNavigate } from 'react-router';
import { CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import type { NotificationItem } from '../../lib/notifications/types';
import { Modal, Sheet } from '../ui';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '../../hooks/queries/useNotificationsQuery';
import { dateLocale } from '../../lib/dateLocale';
import { NotificationItemRow } from './NotificationItemRow';

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  persistedItems: NotificationItem[];
  liveItems: NotificationItem[];
  isLoading?: boolean;
}

function PanelBody({
  persistedItems,
  liveItems,
  isLoading,
  onClose,
  onActivate,
  onMarkAll,
  isMarkingAll,
  showFooter,
}: {
  persistedItems: NotificationItem[];
  liveItems: NotificationItem[];
  isLoading?: boolean;
  onClose: () => void;
  onActivate: (item: NotificationItem) => void;
  onMarkAll: () => void;
  isMarkingAll: boolean;
  showFooter: boolean;
}) {
  const hasPersisted = persistedItems.length > 0;
  const hasLive = liveItems.length > 0;
  const isEmpty = !hasPersisted && !hasLive;

  if (isLoading && isEmpty) {
    return (
      <p className="px-1 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" aria-hidden />
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Todo al día</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">No tienes alertas pendientes</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasPersisted && (
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-[11px] font-bold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
              Novedades
            </h3>
            <button
              type="button"
              onClick={onMarkAll}
              disabled={isMarkingAll}
              className="text-brand text-[11px] font-semibold disabled:opacity-50"
            >
              {isMarkingAll ? 'Marcando…' : 'Marcar todas'}
            </button>
          </div>
          <ul className="space-y-2">
            {persistedItems.map((item) => (
              <li key={item.id}>
                <NotificationItemRow item={item} onActivate={onActivate} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasLive && (
        <section>
          <h3 className="mb-2 px-1 text-[11px] font-bold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
            Requiere atención
          </h3>
          <ul className="space-y-2">
            {liveItems.map((item) => (
              <li key={item.id}>
                <NotificationItemRow item={item} onActivate={onActivate} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {showFooter && (
        <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <Link
            to="/notifications"
            onClick={onClose}
            className="text-brand block text-center text-sm font-semibold"
          >
            {hasPersisted ? 'Ver todas' : 'Ver alertas'}
          </Link>
        </div>
      )}
    </div>
  );
}

export function NotificationPanel({
  open,
  onClose,
  persistedItems,
  liveItems,
  isLoading,
}: NotificationPanelProps) {
  const { isDesktop } = useBreakpoint();
  const navigate = useNavigate();
  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();

  const handleActivate = (item: NotificationItem) => {
    if (item.source === 'persisted' && item.notificationId != null) {
      void markRead.mutateAsync(item.notificationId).finally(() => {
        onClose();
        void navigate(item.href);
      });
      return;
    }
    onClose();
  };

  const handleMarkAll = () => {
    void markAllRead.mutateAsync();
  };

  const body = (
    <PanelBody
      persistedItems={persistedItems}
      liveItems={liveItems}
      isLoading={isLoading}
      onClose={onClose}
      onActivate={handleActivate}
      onMarkAll={handleMarkAll}
      isMarkingAll={markAllRead.isPending}
      showFooter
    />
  );

  if (isDesktop) {
    return (
      <Modal open={open} onClose={onClose} title="Notificaciones" maxWidth="sm">
        {body}
      </Modal>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title="Notificaciones" side="top" zIndex={56}>
      {body}
    </Sheet>
  );
}

export function formatNotificationTime(iso: string): string {
  try {
    return format(new Date(iso), 'd MMM, HH:mm', { locale: dateLocale });
  } catch {
    return iso;
  }
}
