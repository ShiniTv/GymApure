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
      className={cn('mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300', className)}
    >
      {children}
    </label>
  );
}

/** Shared field styles for Input, Select, PasswordInput */
export const fieldClassName = cn(
  'w-full bg-zinc-50 dark:bg-zinc-800 border rounded-xl px-3 py-2.5',
  'text-sm text-zinc-900 dark:text-white font-medium outline-none',
  'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
  'min-h-[var(--touch-min)]',
  'focus:ring-[3px] focus:ring-brand/25 focus-visible:ring-[3px] focus-visible:ring-brand',
  'focus:border-brand/50',
  'transition-all duration-200',
  'border-zinc-200 dark:border-zinc-700',
  'dark:[color-scheme:dark]'
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
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-zinc-400 dark:text-zinc-300 [&>svg]:h-4 [&>svg]:w-4">
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
