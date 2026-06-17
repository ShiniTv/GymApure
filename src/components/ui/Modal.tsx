import { useEffect, type ReactNode } from 'react';
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
}

const maxWidthMap = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

export function Modal({ open, onClose, title, children, className, maxWidth = 'md', scrollable }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={cn(
          'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full shadow-2xl',
          scrollable ? 'max-h-[90vh] overflow-y-auto' : 'p-6',
          !scrollable && 'p-6',
          maxWidthMap[maxWidth],
          className
        )}
      >
        <div className={cn('flex justify-between items-center', scrollable ? 'sticky top-0 bg-white dark:bg-zinc-900 px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 z-10' : 'mb-6')}>
          <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={scrollable ? 'p-6' : undefined}>{children}</div>
      </div>
    </div>
  );
}
