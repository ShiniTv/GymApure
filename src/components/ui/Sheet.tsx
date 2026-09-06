import {
  useEffect,
  useRef,
  useId,
  useCallback,
  useState,
  type ReactNode,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useScrollLock } from '../../hooks/useScrollLock';

const EXIT_MS = 280;
const DISMISS_PX = 96;
const DISMISS_VELOCITY = 0.55; // px/ms

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
  /** Drag-to-dismiss (bottom sheets). Default true. */
  dismissible?: boolean;
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
  dismissible = true,
}: SheetProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragOrigin = useRef(0);
  const lastMove = useRef<{ y: number; t: number } | null>(null);
  const velocity = useRef(0);

  useScrollLock(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setDragY(0);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    setDragging(false);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setDragY(0);
    }, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onCloseRef.current();
  }, []);

  useEffect(() => {
    if (!open || !mounted) return;
    document.addEventListener('keydown', handleKeyDown);

    const sheet = sheetRef.current;
    if (!sheet) {
      return () => document.removeEventListener('keydown', handleKeyDown);
    }

    const getFocusables = () =>
      sheet.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

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

  const canDrag = dismissible && side === 'bottom';

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!canDrag || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, [data-sheet-no-drag]')) return;
    dragStartY.current = e.clientY;
    dragOrigin.current = dragY;
    lastMove.current = { y: e.clientY, t: performance.now() };
    velocity.current = 0;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const delta = e.clientY - dragStartY.current;
    const next = Math.max(0, dragOrigin.current + delta);
    const now = performance.now();
    if (lastMove.current) {
      const dt = now - lastMove.current.t;
      if (dt > 0) velocity.current = (e.clientY - lastMove.current.y) / dt;
    }
    lastMove.current = { y: e.clientY, t: now };
    setDragY(next);
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    const shouldDismiss = dragY > DISMISS_PX || velocity.current > DISMISS_VELOCITY;
    if (shouldDismiss) {
      onCloseRef.current();
      return;
    }
    setDragY(0);
  };

  if (!mounted) return null;

  const backdropZ = zIndex - 1;
  const hideClass = hideFrom === 'lg' ? 'lg:hidden' : '';
  const slideClosed = side === 'bottom' ? 'translate-y-[110%]' : 'translate-y-[-110%]';
  const useLiveDrag = dragging || dragY > 0;
  const panelTransform = useLiveDrag
    ? `translateY(${dragY}px)`
    : visible
      ? 'translateY(0)'
      : undefined;

  return (
    <div className={hideClass}>
      <button
        type="button"
        className={cn(
          'fixed inset-0 bg-black/40 motion-reduce:transition-none',
          !dragging && 'transition-opacity',
          visible && dragY === 0 ? 'opacity-100' : dragY > 0 ? 'opacity-70' : 'opacity-0'
        )}
        style={{
          zIndex: backdropZ,
          transitionDuration: `${EXIT_MS}ms`,
          transitionTimingFunction: 'var(--ease-drawer)',
          opacity: dragging || dragY > 0 ? Math.max(0.2, 1 - dragY / 320) : undefined,
        }}
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          'fixed right-0 left-0 touch-none px-3 motion-reduce:transform-none',
          !useLiveDrag && 'transition-transform motion-reduce:transition-none',
          side === 'bottom' && !panelStyle?.bottom && 'bottom-0',
          side === 'top' && 'top-14',
          !useLiveDrag && (visible ? 'translate-y-0' : slideClosed),
          className
        )}
        style={{
          zIndex,
          transitionDuration: `${EXIT_MS}ms`,
          transitionTimingFunction: 'var(--ease-drawer)',
          transform: panelTransform,
          ...panelStyle,
        }}
      >
        <div
          className={cn(
            'border-border/60 bg-surface rounded-[var(--radius-sheet)] border shadow-none',
            'dark:bg-surface-raised',
            compact ? 'p-2.5' : 'p-ds-3',
            side === 'bottom' && 'mb-2',
            scrollable && 'flex max-h-[min(78dvh,calc(100dvh-7rem))] flex-col',
            cardClassName
          )}
        >
          {showHandle && side === 'bottom' ? (
            <div
              className="flex cursor-grab justify-center pb-1 active:cursor-grabbing"
              aria-hidden
            >
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
                  compact ? 'text-sm font-semibold' : 'text-sm font-semibold'
                )}
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="tap-feedback text-text-muted hover:bg-surface-overlay hover:text-text rounded-md p-1.5"
                aria-label={closeLabel}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {scrollable ? (
            <div
              className="min-h-0 touch-pan-y overflow-y-auto overscroll-contain"
              data-sheet-no-drag
            >
              {children}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
