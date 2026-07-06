import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, X } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import type { NotificationItem } from '../../lib/notifications/types';
import { Modal } from '../ui';
import { useMediaQuery } from '../../lib/useMediaQuery';
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
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const sheetRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!open || isDesktop) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, isDesktop, onClose]);

  useEffect(() => {
    if (!open || isDesktop) return;
    const onPointerDown = (e: PointerEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, isDesktop, onClose]);

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
    <>
      {open && (
        <div className="fixed inset-0 z-[55] bg-black/40 lg:hidden" aria-hidden onClick={onClose} />
      )}
      <div
        ref={sheetRef}
        className={clsx(
          'fixed top-14 right-0 left-0 z-[56] px-3 transition-all duration-200 ease-out lg:hidden',
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
        )}
        role="dialog"
        aria-modal={open}
        aria-label="Notificaciones"
        aria-hidden={!open}
      >
        <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center justify-between px-1 py-1">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Notificaciones</h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Cerrar notificaciones"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {body}
        </div>
      </div>
    </>
  );
}

export function formatNotificationTime(iso: string): string {
  try {
    return format(new Date(iso), 'd MMM, HH:mm', { locale: dateLocale });
  } catch {
    return iso;
  }
}
