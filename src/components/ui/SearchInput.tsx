import { forwardRef, type InputHTMLAttributes } from 'react';
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
  return (
    <div className={cn('relative w-full', containerClassName)}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none z-10"
        aria-hidden
      />
      <input
        ref={ref}
        type="search"
        className={cn(
          fieldClassName,
          'bg-white dark:bg-zinc-900 shadow-sm pl-10 pr-3',
          error ? 'border-red-500' : undefined,
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-xs font-medium text-red-500 mt-1 ml-1">{error}</p>
      )}
    </div>
  );
});

SearchInput.displayName = 'SearchInput';
