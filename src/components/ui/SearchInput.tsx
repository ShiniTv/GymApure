import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { fieldClassName } from './Input';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: string;
  containerClassName?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { className, containerClassName, error, ...props },
  ref
) {
  const errorId = useId();

  return (
    <div className={cn('relative w-full', containerClassName)}>
      <Search
        className="text-text-muted pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2"
        aria-hidden
      />
      <input
        ref={ref}
        type="search"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(fieldClassName, 'pr-3 pl-10', error ? 'border-danger' : undefined, className)}
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

SearchInput.displayName = 'SearchInput';
