import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

interface AuthShellProps {
  variant?: 'auth' | 'kiosk' | 'kiosk-fullscreen';
  /** Formularios más anchos (p. ej. solicitud de demo). */
  wide?: boolean;
  children: ReactNode;
  backLink?: { to: string; label: string };
  footer?: ReactNode;
  className?: string;
}

export default function AuthShell({
  variant = 'auth',
  wide = false,
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
        'relative flex min-h-dvh flex-col overflow-hidden transition-colors duration-300',
        'to-brand/[0.05] bg-gradient-to-br from-zinc-50 via-zinc-50',
        'dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950',
        isFullscreen ? 'items-stretch justify-start p-0' : 'items-center justify-center p-4',
        isKiosk && !isFullscreen ? 'py-8' : '',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className={cn(
            'absolute top-[-10%] left-[-10%] rounded-full',
            isLight
              ? 'bg-brand/20 h-[45%] w-[45%] blur-[140px]'
              : 'bg-brand/10 h-[40%] w-[40%] blur-[120px]'
          )}
        />
        <div
          className={cn(
            'absolute right-[-10%] bottom-[-10%] rounded-full',
            isLight
              ? 'bg-brand/20 h-[45%] w-[45%] blur-[140px]'
              : 'bg-brand/10 h-[40%] w-[40%] blur-[120px]'
          )}
        />
        {isLight && (
          <div className="bg-brand/[0.08] absolute top-1/2 left-1/2 h-[50%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[160px]" />
        )}
        {isFullscreen && (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 opacity-90 dark:from-zinc-950 dark:via-zinc-900 dark:to-black" />
        )}
      </div>

      {!isFullscreen && (
        <div className="absolute top-4 right-4 left-4 z-20 flex items-center justify-between gap-4">
          {backLink ? (
            <Link
              to={backLink.to}
              className="flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
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
            className="ml-auto rounded-xl p-2.5 text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
            aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
        </div>
      )}

      <div
        className={cn(
          'relative z-10 w-full',
          isFullscreen
            ? 'flex min-h-dvh flex-1 flex-col'
            : isKiosk
              ? 'max-w-lg'
              : wide
                ? 'max-w-2xl'
                : 'max-w-md'
        )}
      >
        {children}
        {footer && !isFullscreen && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  );
}
