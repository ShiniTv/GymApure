import { forwardRef, useState, useId, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { fieldClassName } from './Input';

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  showIcon?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, showIcon = true, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const errorId = useId();

    return (
      <div className="w-full">
        <div className="relative">
          {showIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 z-10">
              <Lock className="h-4 w-4 text-zinc-400 dark:text-zinc-300" />
            </div>
          )}
          <input
            ref={ref}
            type={visible ? 'text' : 'password'}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              fieldClassName,
              error && 'border-red-500',
              showIcon && 'pl-10',
              'pr-10',
              className
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 z-10 text-zinc-400 dark:text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            tabIndex={-1}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error && (
          <p id={errorId} className="text-xs font-medium text-red-500 mt-1 ml-1" role="alert">{error}</p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

export function passwordStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: 'Débil' };
  if (score <= 3) return { score: 2, label: 'Regular' };
  return { score: 3, label: 'Fuerte' };
}
