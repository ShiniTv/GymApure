import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight, X } from 'lucide-react';
import clsx from 'clsx';
import { expiryBannerClasses } from '../../lib/expiryUtils';
import type { NotificationItem, NotificationSeverity } from '../../lib/notifications/types';
import { Modal } from '../ui';
import { useMediaQuery } from '../../lib/useMediaQuery';

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  items: NotificationItem[];
  isLoading?: boolean;
}

function itemSeverityClasses(severity: NotificationSeverity = 'info') {
  if (severity === 'info') {
    return {
      itemBorder: 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/30',
      text: 'text-zinc-700 dark:text-zinc-300',
    };
  }
  return expiryBannerClasses(severity);
}

function NotificationList({
  items,
  isLoading,
  onClose,
}: {
  items: NotificationItem[];
  isLoading?: boolean;
  onClose: () => void;
}) {
  if (isLoading && items.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" aria-hidden />
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Todo al día</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">No tienes alertas pendientes</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const styles = itemSeverityClasses(item.severity);
        return (
          <li key={item.id}>
            <Link
              to={item.href}
              onClick={onClose}
              className={clsx(
                'flex min-h-[var(--touch-min)] touch-manipulation items-center gap-3 rounded-xl border px-3 py-3 transition-colors hover:opacity-90',
                styles.itemBorder
              )}
            >
              <div className="min-w-0 flex-1 text-left">
                <p className={clsx('text-sm font-semibold', styles.text)}>{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {item.description}
                  </p>
                )}
              </div>
              {item.count != null && item.count > 1 && (
                <span className="bg-brand flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white">
                  {item.count > 99 ? '99+' : item.count}
                </span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function NotificationPanel({ open, onClose, items, isLoading }: NotificationPanelProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const sheetRef = useRef<HTMLDivElement>(null);

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

  if (isDesktop) {
    return (
      <Modal open={open} onClose={onClose} title="Notificaciones" maxWidth="sm">
        <NotificationList items={items} isLoading={isLoading} onClose={onClose} />
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
          <NotificationList items={items} isLoading={isLoading} onClose={onClose} />
        </div>
      </div>
    </>
  );
}
