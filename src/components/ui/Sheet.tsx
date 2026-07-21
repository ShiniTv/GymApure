import { useEffect, useRef, useId, useCallback, type ReactNode, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useScrollLock } from '../../hooks/useScrollLock';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  closeLabel?: string;
  side?: 'bottom' | 'top';
  className?: string;
  /** Classes for the inner card surface */
  cardClassName?: string;
  panelStyle?: CSSProperties;
  /** z-index layer — default 56 (above nav, below modal) */
  zIndex?: number;
  /** Hide on desktop breakpoints; pass `false` to always show */
  hideFrom?: 'lg' | false;
  /** Cap height and scroll body (staff Más sheets) */
  scrollable?: boolean;
  /** Subtle top handle for bottom sheets */
  showHandle?: boolean;
  /** Tighter header + padding for compact menus */
  compact?: boolean;
  /** Accessible name when `title` is omitted (e.g. custom greeting header) */
  ariaLabel?: string;
}

export function Sheet({
  open,
  onClose,
  children,
  title,
  closeLabel = 'Cerrar',
  side = 'bottom',
  className,
  cardClassName,
  panelStyle,
  zIndex = 56,
  hideFrom = 'lg',
  scrollable = false,
  showHandle = false,
  compact = false,
  ariaLabel,
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

    const sheet = sheetRef.current;
    if (sheet) {
      const focusables = sheet.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      requestAnimationFrame(() => first?.focus());

      const trapFocus = (e: KeyboardEvent) => {
        if (e.key !== 'Tab' || focusables.length === 0) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      };
      document.addEventListener('keydown', trapFocus);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keydown', trapFocus);
      };
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  const backdropZ = zIndex - 1;
  const hideClass = hideFrom === 'lg' ? 'lg:hidden' : '';

  return (
    <div className={hideClass}>
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
        aria-label={!title ? ariaLabel : undefined}
        className={cn(
          'fixed right-0 left-0 px-3 transition-transform duration-200 ease-out',
          side === 'bottom' && !panelStyle?.bottom && 'bottom-0',
          side === 'top' && 'top-14',
          className
        )}
        style={{ zIndex, ...panelStyle }}
      >
        <div
          className={cn(
            'rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900',
            compact ? 'p-2.5' : 'p-3',
            side === 'bottom' && 'mb-2',
            scrollable && 'flex max-h-[min(78dvh,calc(100dvh-7rem))] flex-col',
            cardClassName
          )}
        >
          {showHandle && side === 'bottom' ? (
            <div className="flex justify-center pb-1" aria-hidden>
              <div className="h-1 w-8 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            </div>
          ) : null}
          {title && (
            <div
              className={cn(
                'flex shrink-0 items-center justify-between gap-2',
                compact ? 'mb-1.5' : 'mb-2'
              )}
            >
              <h2
                id={titleId}
                className={cn(
                  'text-zinc-900 dark:text-white',
                  compact ? 'text-sm font-semibold' : 'text-sm font-bold'
                )}
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                aria-label={closeLabel}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {scrollable ? (
            <div className="min-h-0 overflow-y-auto overscroll-contain">{children}</div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
