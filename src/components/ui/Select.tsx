import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { fieldClassName } from './Input';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, wrapperClassName, error, children, ...props },
  ref
) {
  const errorId = useId();

  return (
    <div className={cn('relative w-full', wrapperClassName)}>
      <div className="relative w-full">
        <select
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            fieldClassName,
            'bg-surface text-text cursor-pointer appearance-none pr-9',
            error && 'border-danger focus:border-danger focus:ring-danger/25',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="text-text-muted pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2"
          aria-hidden
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-danger text-small mt-1 font-medium">
          {error}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';
