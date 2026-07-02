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
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-300 pointer-events-none z-10"
        aria-hidden
      />
      <input
        ref={ref}
        type="search"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          fieldClassName,
          'bg-white dark:bg-zinc-900 shadow-sm pl-10 pr-3',
          error ? 'border-red-500' : undefined,
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

SearchInput.displayName = 'SearchInput';
