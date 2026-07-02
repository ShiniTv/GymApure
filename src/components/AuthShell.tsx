import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

interface AuthShellProps {
  variant?: 'auth' | 'kiosk' | 'kiosk-fullscreen';
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
  const isKiosk = variant === 'kiosk' || variant === 'kiosk-fullscreen';
  const isFullscreen = variant === 'kiosk-fullscreen';
  const isLight = theme === 'light';

  return (
    <div
      className={cn(
        'min-h-dvh flex flex-col relative overflow-hidden transition-colors duration-300',
        'bg-gradient-to-br from-zinc-50 via-zinc-50 to-brand/[0.05]',
        'dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950',
        isFullscreen
          ? 'items-stretch justify-start p-0'
          : 'items-center justify-center p-4',
        isKiosk && !isFullscreen ? 'py-8' : '',
        className
      )}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div
          className={cn(
            'absolute top-[-10%] left-[-10%] rounded-full',
            isLight
              ? 'w-[45%] h-[45%] bg-brand/20 blur-[140px]'
              : 'w-[40%] h-[40%] bg-brand/10 blur-[120px]'
          )}
        />
        <div
          className={cn(
            'absolute bottom-[-10%] right-[-10%] rounded-full',
            isLight
              ? 'w-[45%] h-[45%] bg-brand/20 blur-[140px]'
              : 'w-[40%] h-[40%] bg-brand/10 blur-[120px]'
          )}
        />
        {isLight && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[50%] bg-brand/[0.08] blur-[160px] rounded-full" />
        )}
        {isFullscreen && (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 dark:from-zinc-950 dark:via-zinc-900 dark:to-black opacity-90" />
        )}
      </div>

      {!isFullscreen && (
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-4">
          {backLink ? (
            <Link
              to={backLink.to}
              className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors font-medium"
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
      )}

      <div
        className={cn(
          'w-full relative z-10',
          isFullscreen ? 'flex-1 flex flex-col min-h-dvh' : isKiosk ? 'max-w-lg' : 'max-w-md'
        )}
      >
        {children}
        {footer && !isFullscreen && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  );
}
