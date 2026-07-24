import {
  useEffect,
  useRef,
  useId,
  useCallback,
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useScrollLock } from '../../hooks/useScrollLock';

const EXIT_MS = 280;

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
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useScrollLock(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onCloseRef.current();
  }, []);

  // Re-run when `mounted` flips true so focus/trap attach after exit-anim remount.
  useEffect(() => {
    if (!open || !mounted) return;
    document.addEventListener('keydown', handleKeyDown);

    const sheet = sheetRef.current;
    if (!sheet) {
      return () => document.removeEventListener('keydown', handleKeyDown);
    }

    const getFocusables = () =>
      sheet.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');

    requestAnimationFrame(() => getFocusables()[0]?.focus());

    const trapFocus = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = getFocusables();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
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
  }, [open, mounted, handleKeyDown]);

  if (!mounted) return null;

  const backdropZ = zIndex - 1;
  const hideClass = hideFrom === 'lg' ? 'lg:hidden' : '';
  const slideClosed = side === 'bottom' ? 'translate-y-[110%]' : 'translate-y-[-110%]';

  return (
    <div className={hideClass}>
      <button
        type="button"
        className={cn(
          'fixed inset-0 bg-black/40 transition-opacity ease-in-out',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        style={{ zIndex: backdropZ, transitionDuration: `${EXIT_MS}ms` }}
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel : undefined}
        className={cn(
          'fixed right-0 left-0 px-3 transition-transform ease-in-out',
          side === 'bottom' && !panelStyle?.bottom && 'bottom-0',
          side === 'top' && 'top-14',
          visible ? 'translate-y-0' : slideClosed,
          className
        )}
        style={{ zIndex, transitionDuration: `${EXIT_MS}ms`, ...panelStyle }}
      >
        <div
          className={cn(
            'rounded-sheet border-border bg-surface-raised shadow-sheet border',
            compact ? 'p-2.5' : 'p-ds-3',
            side === 'bottom' && 'mb-2',
            scrollable && 'flex max-h-[min(78dvh,calc(100dvh-7rem))] flex-col',
            cardClassName
          )}
        >
          {showHandle && side === 'bottom' ? (
            <div className="flex justify-center pb-1" aria-hidden>
              <div className="bg-surface-overlay h-1 w-8 rounded-full" />
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
                  'text-text tracking-[-0.02em]',
                  compact ? 'text-sm font-semibold' : 'text-sm font-bold'
                )}
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="tap-feedback text-text-muted hover:bg-surface-overlay hover:text-text-secondary rounded-lg p-1.5"
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
