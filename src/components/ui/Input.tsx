import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
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
      className={cn(
        'block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1',
        className
      )}
    >
      {children}
    </label>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, ...props }, ref) {
    return (
    <div>
      <input
        ref={ref}
        className={cn(
          'w-full bg-zinc-50 dark:bg-zinc-800 border rounded-2xl px-4 py-3',
          'text-zinc-900 dark:text-white font-bold outline-none',
          'focus:ring-2 focus:ring-orange-500 transition-all',
          error ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-700',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-[10px] font-bold text-red-500 mt-1 uppercase ml-1">{error}</p>
      )}
    </div>
    );
  }
);

Input.displayName = 'Input';
