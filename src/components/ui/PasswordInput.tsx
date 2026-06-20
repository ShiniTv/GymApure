import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  showIcon?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, showIcon = true, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div>
        <div className="relative">
          {showIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 z-10">
              <Lock className="h-5 w-5 text-zinc-400" />
            </div>
          )}
          <input
            ref={ref}
            type={visible ? 'text' : 'password'}
            className={cn(
              'w-full bg-zinc-50 dark:bg-zinc-800 border rounded-2xl px-4 py-3',
              'text-zinc-900 dark:text-white font-bold outline-none',
              'focus:ring-2 focus:ring-orange-500 transition-all',
              error ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-700',
              showIcon && 'pl-10',
              'pr-12',
              className
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 z-10 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            tabIndex={-1}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {error && (
          <p className="text-xs font-medium text-red-500 mt-1 ml-1">{error}</p>
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
