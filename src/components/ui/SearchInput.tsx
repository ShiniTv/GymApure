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
        className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-300"
        aria-hidden
      />
      <input
        ref={ref}
        type="search"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          fieldClassName,
          'bg-white pr-3 pl-10 shadow-sm dark:bg-zinc-900',
          error ? 'border-red-500' : undefined,
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

SearchInput.displayName = 'SearchInput';
