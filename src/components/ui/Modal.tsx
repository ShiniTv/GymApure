import { useEffect, useRef, useId, useCallback, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  scrollable?: boolean;
  /** 'input' (default): focus first field; 'dialog': focus panel without opening mobile keyboard; false: no focus move */
  initialFocus?: 'input' | 'dialog' | false;
}

const maxWidthMap = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const dialogVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, duration: 0.3, bounce: 0.15 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 8,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
} satisfies Variants;

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

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

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
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';
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
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleKeyDown, initialFocus]);

  if (!portalTarget) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] overflow-y-auto bg-black/50 backdrop-blur-sm"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.15 }}
        >
          <div className="flex min-h-full items-center justify-center p-4 py-6 sm:py-4">
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={contentId}
              tabIndex={-1}
              variants={dialogVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cn(
                'my-auto w-full rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900',
                scrollable
                  ? 'flex max-h-[90dvh] flex-col overflow-hidden'
                  : 'scroll-area max-h-[calc(100dvh-3rem)] overflow-y-auto p-4 sm:p-5',
                maxWidthMap[maxWidth],
                className
              )}
            >
              <div
                className={cn(
                  'flex shrink-0 items-center justify-between gap-3',
                  scrollable
                    ? 'border-b border-zinc-100 px-4 py-3 sm:px-5 dark:border-zinc-800'
                    : 'mb-4'
                )}
              >
                <h2
                  id={titleId}
                  className="text-base font-bold text-zinc-900 sm:text-lg dark:text-white"
                >
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
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
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    portalTarget
  );
}
