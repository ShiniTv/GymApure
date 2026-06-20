import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, error, ...props },
  ref
) {
  return (
    <div>
      <textarea
        ref={ref}
        className={cn(
          'w-full bg-zinc-50 dark:bg-zinc-800 border rounded-2xl px-4 py-3',
          'text-zinc-900 dark:text-white font-medium outline-none resize-y min-h-[80px]',
          'focus:ring-2 focus:ring-orange-500 transition-all',
          error ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-700',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-xs font-medium text-red-500 mt-1 ml-1">{error}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';
