import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface LabelProps {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}

export function Label({ children, htmlFor, className }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('text-text-secondary mb-1 block text-xs font-medium', className)}
    >
      {children}
    </label>
  );
}

/** Shared field styles for Input, Select, PasswordInput — Linear-quiet */
export const fieldClassName = cn(
  'w-full bg-surface border rounded-[var(--radius-input)] px-3 py-2.5',
  'text-sm text-text font-medium outline-none',
  'placeholder:text-text-muted',
  'min-h-[var(--touch-min)]',
  'focus:ring-[2px] focus:ring-border focus-visible:ring-[2px] focus-visible:ring-border',
  'focus:border-border',
  'transition-[border-color,box-shadow,background-color] duration-150',
  'border-border/70 hover:border-border',
  'dark:bg-bg dark:[color-scheme:dark]'
);

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leadingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, leadingIcon, ...props },
  ref
) {
  const hasLeading = Boolean(leadingIcon);
  const errorId = useId();

  return (
    <div className="w-full">
      <div className={cn(hasLeading && 'relative')}>
        {hasLeading && (
          <div className="text-text-muted pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 [&>svg]:h-4 [&>svg]:w-4">
            {leadingIcon}
          </div>
        )}
        <input
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            fieldClassName,
            error && 'border-red-500',
            hasLeading && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p id={errorId} className="mt-1 ml-1 text-xs font-medium text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
