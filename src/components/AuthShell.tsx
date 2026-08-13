import { type ReactNode, lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

const AuthMarketingPanel = lazy(() => import('./AuthMarketingPanel'));

function DesktopAuthMarketing() {
  const [enabled, setEnabled] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setEnabled(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (!enabled) return null;

  return (
    <Suspense fallback={<div className="bg-bg hidden lg:block" aria-hidden />}>
      <AuthMarketingPanel />
    </Suspense>
  );
}
interface AuthShellProps {
  variant?: 'auth' | 'kiosk' | 'kiosk-fullscreen';
  aesthetic?: 'default' | 'linear';
  /**
   * `split` = panel de marca en lg+ + formulario (login/register/forgot/reset).
   * `centered` = card centrada (kiosk / casos estrechos).
   */
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
  layout = 'centered',
  wide = false,
  children,
  backLink,
  footer,
  className,
}: AuthShellProps) {
  const { theme, toggleTheme } = useTheme();
  const isKiosk = variant === 'kiosk' || variant === 'kiosk-fullscreen';
  const isFullscreen = variant === 'kiosk-fullscreen';
  const useSplit = layout === 'split' && !isKiosk;
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
          : useSplit
            ? 'max-w-md md:max-w-lg lg:max-w-md'
            : 'max-w-[22rem] sm:max-w-md'
  );

  const formColumn = (
    <div
      className={cn(
        'relative flex w-full flex-col',
        useSplit
          ? 'min-h-dvh items-center justify-center p-4 sm:p-6 lg:p-10'
          : isFullscreen
            ? 'min-h-dvh'
            : 'items-center justify-center'
      )}
    >
      {useSplit && (
        <div className="absolute top-4 right-4 left-4 z-20 flex items-center justify-between gap-4 lg:left-auto">
          {backLink ? (
            <Link
              to={backLink.to}
              className="text-text-muted hover:text-text flex items-center gap-2 text-sm font-medium transition-colors lg:hidden"
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

      {useSplit && backLink && (
        <Link
          to={backLink.to}
          className="text-text-muted hover:text-text absolute top-4 left-4 z-20 hidden items-center gap-2 text-sm font-medium transition-colors lg:flex"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          {backLink.label}
        </Link>
      )}

      <div
        className={cn(
          contentMax,
          useSplit &&
            (isLinear
              ? 'animate-[auth-fade-in_200ms_ease-out]'
              : 'animate-[auth-fade-in_450ms_ease-out]')
        )}
      >
        {children}
        {footer && !isFullscreen && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  );

  if (useSplit) {
    return (
      <div
        className={cn(
          'relative min-h-dvh overflow-hidden transition-colors duration-300',
          isLinear ? 'auth-linear dark bg-bg text-text' : 'bg-bg',
          className
        )}
      >
        {isLinear ? <div className="auth-linear-grid" aria-hidden /> : null}

        <div className="relative grid min-h-dvh lg:grid-cols-2">
          <DesktopAuthMarketing />
          {formColumn}
        </div>
      </div>
    );
  }

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
      {isLinear ? <div className="auth-linear-grid" aria-hidden /> : null}

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
