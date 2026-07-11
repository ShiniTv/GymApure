import { useEffect, useRef, useId, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useScrollLock } from '../../hooks/useScrollLock';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  side?: 'bottom' | 'top';
  className?: string;
  /** z-index layer — default 56 (above nav, below modal) */
  zIndex?: number;
}

export function Sheet({
  open,
  onClose,
  children,
  title,
  side = 'bottom',
  className,
  zIndex = 56,
}: SheetProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useScrollLock(open);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onCloseRef.current();
  }, []);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  const backdropZ = zIndex - 1;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 transition-opacity"
        style={{ zIndex: backdropZ }}
        aria-hidden
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          'fixed right-0 left-0 px-3 transition-transform duration-200 ease-out',
          side === 'bottom' && 'bottom-0 pb-[calc(var(--mobile-nav-height,0px)+0.75rem)]',
          side === 'top' && 'top-14',
          className
        )}
        style={{ zIndex }}
      >
        <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          {title && (
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 id={titleId} className="text-sm font-bold text-zinc-900 dark:text-white">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </>
  );
}
