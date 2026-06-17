import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

interface AuthShellProps {
  variant?: 'auth' | 'kiosk';
  children: ReactNode;
  backLink?: { to: string; label: string };
  footer?: ReactNode;
  className?: string;
}

export default function AuthShell({
  variant = 'auth',
  children,
  backLink,
  footer,
  className,
}: AuthShellProps) {
  const { theme, toggleTheme } = useTheme();
  const isKiosk = variant === 'kiosk';

  return (
    <div
      className={cn(
        'min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-300',
        'bg-zinc-50 dark:bg-zinc-950',
        isKiosk ? 'py-8' : '',
        className
      )}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-4">
        {backLink ? (
          <Link
            to={backLink.to}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{backLink.label}</span>
          </Link>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ml-auto"
          title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
          aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>
      </div>

      <div className={cn('w-full relative z-10', isKiosk ? 'max-w-md' : 'max-w-md')}>
        {children}
        {footer}
      </div>
    </div>
  );
}
