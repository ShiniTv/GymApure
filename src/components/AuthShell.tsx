import { type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

interface AuthShellProps {
  variant?: 'auth' | 'kiosk' | 'kiosk-fullscreen';
  aesthetic?: 'default' | 'linear';
  /** Kept for call-site compatibility. Auth is always a centered card. */
  layout?: 'centered' | 'split';
  /** Formularios más anchos (p. ej. solicitud de demo). */
  wide?: boolean;
  children: ReactNode;
  backLink?: { to: string; label: string };
  footer?: ReactNode;
  className?: string;
}

export default function AuthShell({
  variant = 'auth',
  aesthetic = 'default',
  wide = false,
  children,
  backLink,
  footer,
  className,
}: AuthShellProps) {
  const { theme, toggleTheme } = useTheme();
  const isKiosk = variant === 'kiosk' || variant === 'kiosk-fullscreen';
  const isFullscreen = variant === 'kiosk-fullscreen';
  const isLinear = aesthetic === 'linear';

  const themeToggle = !isFullscreen && !isLinear && (
    <button
      type="button"
      onClick={toggleTheme}
      className="text-text-muted hover:bg-surface-overlay hover:text-text rounded-xl p-2.5 transition-colors"
      title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
      aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
    >
      {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );

  const contentMax = cn(
    'relative z-10 w-full',
    isFullscreen
      ? 'flex min-h-dvh flex-1 flex-col'
      : isKiosk
        ? 'max-w-lg'
        : wide
          ? 'max-w-2xl'
          : isLinear
            ? 'max-w-[22rem] sm:max-w-[24rem]'
            : 'max-w-[22rem] sm:max-w-md'
  );

  return (
    <div
      className={cn(
        'relative min-h-dvh w-full overflow-hidden transition-colors duration-300',
        isLinear ? 'auth-linear dark bg-bg text-text' : 'bg-bg',
        isFullscreen
          ? 'flex flex-col items-stretch justify-start p-0'
          : 'grid place-items-center p-4',
        isKiosk && !isFullscreen ? 'py-8' : '',
        className
      )}
    >
      {!isFullscreen && (
        <div className="absolute top-4 right-4 left-4 z-20 flex items-center justify-between gap-4">
          {backLink ? (
            <Link
              to={backLink.to}
              className="text-text-muted hover:text-text flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{backLink.label}</span>
            </Link>
          ) : (
            <span />
          )}
          <div className="ml-auto">{themeToggle}</div>
        </div>
      )}

      <div className={cn(contentMax, !isFullscreen && 'mx-auto')}>
        {children}
        {footer && !isFullscreen && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  );
}
