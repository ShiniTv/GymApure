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
          'border-border bg-surface w-full rounded-[var(--radius-input)] border px-4 py-3',
          'text-text min-h-[80px] resize-y font-medium outline-none',
          'placeholder:text-text-muted',
          'focus:ring-brand/30 focus-visible:ring-brand transition-[border-color,box-shadow,background-color] duration-150 focus:ring-2 focus-visible:ring-2',
          'dark:[color-scheme:dark]',
          error ? 'border-danger' : 'border-border',
          className
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-danger text-small mt-1 ml-1 font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';
