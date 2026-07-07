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
          'w-full rounded-xl border bg-zinc-50 px-4 py-3 dark:bg-zinc-800',
          'min-h-[80px] resize-y font-medium text-zinc-900 outline-none dark:text-white',
          'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
          'focus:ring-brand/30 focus-visible:ring-brand transition-all focus:ring-2 focus-visible:ring-2',
          'dark:[color-scheme:dark]',
          error ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-700',
          className
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1 ml-1 text-xs font-medium text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';
