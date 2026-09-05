import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { fieldClassName } from './Input';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, error, ...props },
  ref
) {
  const errorId = useId();

  return (
    <div className="w-full">
      <select
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          fieldClassName,
          error && 'border-danger focus:border-danger focus:ring-danger/25',
          className
        )}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="text-danger text-small mt-1 font-medium">
          {error}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';
