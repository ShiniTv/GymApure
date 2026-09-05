import { useEffect, useRef, useId, useCallback, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useScrollLock } from '../../hooks/useScrollLock';
import { IconButton } from './IconButton';
import { typography } from '../../lib/typography';

const EXIT_MS = 200;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** Sticky action bar below the scroll area (Cancelar / Guardar). */
  footer?: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  scrollable?: boolean;
  /** 'input' (default): focus first field; 'dialog': focus panel without opening mobile keyboard; false: no focus move */
  initialFocus?: 'input' | 'dialog' | false;
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

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  maxWidth = 'md',
  scrollable,
  initialFocus = 'input',
}: ModalProps) {
  const titleId = useId();
  const contentId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

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
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
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
        'fixed inset-0 z-[80] overflow-y-auto transition-opacity duration-200 ease-out motion-reduce:transition-none',
        visible ? 'opacity-100' : 'opacity-0'
      )}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Cerrar diálogo"
        onClick={onClose}
      />
      <div className="relative flex min-h-full items-center justify-center p-4 py-6 sm:py-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={contentId}
          tabIndex={-1}
          className={cn(
            'border-border/60 bg-surface my-auto w-full rounded-[var(--radius-card)] border shadow-none transition-[opacity,transform] duration-200 motion-reduce:transform-none motion-reduce:transition-none',
            'dark:bg-surface-raised dark:border-border/70',
            '[transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
            visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-1 scale-95 opacity-0',
            scrollable
              ? 'flex max-h-[90dvh] flex-col overflow-hidden'
              : 'scroll-area p-ds-4 sm:p-ds-5 max-h-[calc(100dvh-3rem)] overflow-y-auto',
            maxWidthMap[maxWidth],
            className
          )}
        >
          <div
            className={cn(
              'flex shrink-0 items-center justify-between gap-3',
              scrollable ? 'border-border/60 px-ds-4 sm:px-ds-5 border-b py-3' : 'mb-4'
            )}
          >
            <h2 id={titleId} className={cn(typography.sectionTitle, 'text-text sm:text-base')}>
              {title}
            </h2>
            <IconButton
              type="button"
              size="md"
              variant="tertiary"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </IconButton>
          </div>
          <div
            id={contentId}
            className={cn(scrollable && 'scroll-area p-ds-4 sm:p-ds-5 flex-1 overflow-y-auto')}
          >
            {children}
          </div>
          {footer ? (
            <div
              className={cn(
                'flex shrink-0 items-center gap-2',
                scrollable ? 'border-border/60 px-ds-4 sm:px-ds-5 border-t py-2.5' : 'mt-4'
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
