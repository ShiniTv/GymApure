import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, containerClassName, error, ...props },
  ref
) {
  const errorId = useId();

  return (
    <div className={cn(containerClassName)}>
      <textarea
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'w-full bg-zinc-50 dark:bg-zinc-800 border rounded-xl px-4 py-3',
          'text-zinc-900 dark:text-white font-medium outline-none resize-y min-h-[80px]',
          'focus:ring-2 focus:ring-brand/30 focus-visible:ring-2 focus-visible:ring-brand transition-all',
          error ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-700',
          className
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs font-medium text-red-500 mt-1 ml-1" role="alert">{error}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';
