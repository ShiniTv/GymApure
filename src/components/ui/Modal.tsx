import { useEffect, useRef, useId, useCallback, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useScrollLock } from '../../hooks/useScrollLock';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  scrollable?: boolean;
  /** 'input' (default): focus first field; 'dialog': focus panel without opening mobile keyboard; false: no focus move */
  initialFocus?: 'input' | 'dialog' | false;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-3xl',
  '3xl': 'max-w-4xl',
};

export function Modal({
  open,
  onClose,
  title,
  children,
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
  const [visible, setVisible] = useState(false);

  useScrollLock(open);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }

    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
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
    if (!open) {
      previousFocusRef.current?.focus();
      return;
    }

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
  }, [open, handleKeyDown, initialFocus]);

  if (!portalTarget || !open) return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[80] overflow-y-auto transition-opacity duration-150',
        visible ? 'opacity-100' : 'opacity-0'
      )}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
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
            'my-auto w-full rounded-sheet border border-border bg-surface shadow-elevated transition-all duration-200',
            visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
            scrollable
              ? 'flex max-h-[90dvh] flex-col overflow-hidden'
              : 'scroll-area max-h-[calc(100dvh-3rem)] overflow-y-auto p-ds-4 sm:p-ds-5',
            maxWidthMap[maxWidth],
            className
          )}
        >
          <div
            className={cn(
              'flex shrink-0 items-center justify-between gap-3',
              scrollable ? 'border-b border-border px-ds-4 py-3 sm:px-ds-5' : 'mb-4'
            )}
          >
            <h2
              id={titleId}
              className="font-display text-base font-bold tracking-[-0.02em] text-text sm:text-lg"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div
            id={contentId}
            className={cn(scrollable && 'scroll-area flex-1 overflow-y-auto p-4 sm:p-5')}
          >
            {children}
          </div>
        </div>
      </div>
    </div>,
    portalTarget
  );
}
