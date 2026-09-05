import {
  useEffect,
  useRef,
  useId,
  useCallback,
  useState,
  type ReactNode,
  type HTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { X, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useScrollLock } from '../../hooks/useScrollLock';
import { IconButton } from './IconButton';
import { typography } from '../../lib/typography';
import { OperateIcon, type OperateIconTone } from '../operate/OperateIcon';

const EXIT_MS = 280;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  /** Supporting line under the title (confirm copy, form context). */
  description?: ReactNode;
  /** Optional leading glyph in the header well. */
  icon?: LucideIcon;
  /** Sticky action bar below the scroll area (Cancelar / Guardar). */
  footer?: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  scrollable?: boolean;
  /** 'input' (default): focus first field; 'dialog': focus panel without opening mobile keyboard; false: no focus move */
  initialFocus?: 'input' | 'dialog' | false;
  /**
   * Visual tone for the header icon / emphasis.
   * `danger` for destructive confirms; default is quiet Operate chrome.
   */
  tone?: 'default' | 'danger' | 'brand';
}

/** Honest Tailwind max-width map — see docs/qa/UI-CONTRACT.md */
const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
};

function toneToIcon(tone: ModalProps['tone']): OperateIconTone {
  if (tone === 'danger') return 'danger';
  if (tone === 'brand') return 'brand';
  return 'neutral';
}

/**
 * Premium Apple Operate dialog.
 * Mobile: docks as a soft sheet from the bottom.
 * Desktop: centered floating panel with modal elevation.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  className,
  maxWidth = 'md',
  scrollable,
  initialFocus = 'input',
  tone = 'default',
}: ModalProps) {
  const titleId = useId();
  const contentId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  const hasDescription = description != null && description !== false && description !== '';
  /** Prefer structured chrome whenever footer is present or content may scroll. */
  const structured = Boolean(footer) || Boolean(scrollable);

  useScrollLock(open);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

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
    if (e.key === 'Escape') {
      onCloseRef.current();
      return;
    }

    if (e.key === 'Tab') {
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  useEffect(() => {
    if (!mounted) {
      previousFocusRef.current?.focus();
      return;
    }
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement;
    document.addEventListener('keydown', handleKeyDown);

    requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog || initialFocus === false) return;

      if (initialFocus === 'dialog') {
        dialog.focus();
        return;
      }

      const preferred = dialog.querySelector<HTMLElement>(
        'input, select, textarea, [contenteditable="true"]'
      );
      const first =
        preferred ??
        dialog.querySelector<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])');
      first?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, mounted, handleKeyDown, initialFocus]);

  if (!portalTarget || !mounted) return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[80] overflow-y-auto overscroll-contain transition-opacity motion-reduce:transition-none',
        visible ? 'opacity-100' : 'opacity-0'
      )}
      style={{
        transitionDuration: `${EXIT_MS}ms`,
        transitionTimingFunction: 'var(--ease-drawer)',
      }}
    >
      <button
        type="button"
        className={cn('absolute inset-0 bg-black/55 backdrop-blur-[2px]', 'dark:bg-black/70')}
        aria-label="Cerrar diálogo"
        onClick={onClose}
      />

      <div
        className={cn(
          'relative flex min-h-full justify-center',
          /* Mobile: dock to bottom like a premium sheet */
          'items-end p-0 pt-10',
          /* Tablet+: centered floating dialog */
          'sm:items-center sm:p-4 sm:py-8'
        )}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={
            hasDescription && children
              ? `${descId} ${contentId}`
              : hasDescription
                ? descId
                : children
                  ? contentId
                  : undefined
          }
          tabIndex={-1}
          className={cn(
            'surface-modal relative my-0 w-full outline-none',
            'transition-[opacity,transform] motion-reduce:transform-none motion-reduce:transition-none',
            '[transition-timing-function:var(--ease-drawer)]',
            visible
              ? 'translate-y-0 scale-100 opacity-100'
              : 'translate-y-3 scale-[0.98] opacity-0 sm:translate-y-2',
            /* Mobile sheet chrome */
            'max-sm:rounded-t-[var(--radius-sheet)] max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0',
            'max-sm:max-h-[min(92dvh,100%)]',
            /* Desktop float */
            'sm:my-auto sm:rounded-[var(--radius-modal)]',
            structured
              ? 'flex max-h-[min(92dvh,100%)] flex-col overflow-hidden sm:max-h-[min(90dvh,52rem)]'
              : 'scroll-area max-h-[min(92dvh,100%)] overflow-y-auto sm:max-h-[calc(100dvh-4rem)]',
            maxWidthMap[maxWidth],
            className
          )}
          style={{ transitionDuration: `${EXIT_MS}ms` }}
        >
          {/* Grab affordance — mobile only */}
          <div className="flex justify-center pt-2.5 pb-0.5 sm:hidden" aria-hidden>
            <span className="bg-border h-1 w-10 rounded-full opacity-80" />
          </div>

          <div
            className={cn(
              'flex shrink-0 items-start gap-3',
              structured
                ? 'border-border/50 px-ds-4 sm:px-ds-5 border-b py-3.5 sm:py-4'
                : 'px-ds-4 sm:px-ds-5 pt-1 pb-3 sm:pt-5'
            )}
          >
            {icon ? (
              <OperateIcon icon={icon} tone={toneToIcon(tone)} well size="md" className="mt-0.5" />
            ) : null}
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 id={titleId} className={cn(typography.cardTitle, 'text-text')}>
                {title}
              </h2>
              {hasDescription ? (
                <p
                  id={descId}
                  className="text-text-muted text-small mt-1 leading-snug tracking-[-0.006em]"
                >
                  {description}
                </p>
              ) : null}
            </div>
            <IconButton
              type="button"
              size="md"
              variant="tertiary"
              onClick={onClose}
              aria-label="Cerrar"
              className="bg-surface-raised/80 hover:bg-surface-overlay -mt-0.5 shrink-0"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </IconButton>
          </div>

          <div
            id={contentId}
            className={cn(
              structured
                ? 'scroll-area px-ds-4 sm:px-ds-5 flex-1 overflow-y-auto py-4'
                : 'px-ds-4 sm:px-ds-5 pb-ds-4 sm:pb-ds-5',
              !children && structured && 'hidden py-0'
            )}
          >
            {children}
          </div>

          {footer ? (
            <div
              className={cn(
                'border-border/50 bg-surface/90 dark:bg-surface-raised/95 shrink-0 border-t',
                'px-ds-4 sm:px-ds-5 py-3 backdrop-blur-md',
                'pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3.5'
              )}
            >
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    portalTarget
  );
}

/**
 * Standard action row for modal footers — stacked on mobile, trailing on desktop.
 */
export function ModalActions({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2.5',
        '[&>button]:w-full sm:[&>button]:w-auto sm:[&>button]:min-w-[6.5rem]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type { ModalProps };
