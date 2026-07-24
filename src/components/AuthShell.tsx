import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import AuthMarketingPanel from './AuthMarketingPanel';

interface AuthShellProps {
  variant?: 'auth' | 'kiosk' | 'kiosk-fullscreen';
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
  const isLight = theme === 'light';
  const useSplit = layout === 'split' && !isKiosk;

  const themeToggle = !isFullscreen && (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'rounded-xl p-2.5 transition-colors',
        'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white',
        useSplit
          ? 'border border-zinc-200/90 bg-white/90 shadow-sm backdrop-blur-sm hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/90 dark:hover:bg-zinc-800'
          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
      )}
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
            ? // Formulario deliberadamente contenido; la columna da aire alrededor
              'max-w-md md:max-w-lg lg:max-w-[22.5rem] xl:max-w-[24rem]'
            : 'max-w-md md:max-w-lg'
  );

  const formColumn = (
    <div
      className={cn(
        'relative flex w-full flex-col',
        useSplit
          ? cn(
              'min-h-dvh bg-zinc-50 dark:bg-zinc-950',
              'items-center justify-center p-4 sm:p-6',
              // Desktop: ancla el form hacia el borde del split (no isla centrada)
              'lg:items-stretch lg:justify-stretch lg:p-0'
            )
          : isFullscreen
            ? 'min-h-dvh'
            : 'items-center justify-center'
      )}
    >
      {useSplit && (
        <div className="absolute top-4 right-4 left-4 z-20 flex items-center justify-between gap-4 lg:right-6 lg:left-auto xl:right-10">
          {backLink ? (
            <Link
              to={backLink.to}
              className="flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 lg:hidden dark:text-zinc-400 dark:hover:text-white"
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
          className="absolute top-5 left-[12%] z-20 hidden items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 lg:flex xl:left-[14%] dark:text-zinc-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          {backLink.label}
        </Link>
      )}

      <div
        className={cn(
          useSplit &&
            'flex w-full flex-1 flex-col justify-center lg:pr-[10%] lg:pl-[12%] xl:pr-[12%] xl:pl-[14%]',
          !useSplit && contentMax
        )}
      >
        <div
          className={cn(
            useSplit ? contentMax : undefined,
            useSplit && 'animate-[auth-fade-in_450ms_ease-out]'
          )}
        >
          {children}
          {footer && !isFullscreen && <div className="mt-6">{footer}</div>}
        </div>
      </div>
    </div>
  );

  if (useSplit) {
    return (
      <div
        className={cn(
          'relative min-h-dvh overflow-hidden transition-colors duration-300',
          'to-brand/[0.05] bg-gradient-to-br from-zinc-50 via-zinc-50',
          'dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950',
          className
        )}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden" aria-hidden>
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
        </div>

        {/* Marca ~57% / formulario ~43% — el hero gana presencia */}
        <div className="relative grid min-h-dvh lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <AuthMarketingPanel />
          <div className="relative min-h-dvh border-zinc-200 lg:border-l dark:border-zinc-800">
            <div
              className="pointer-events-none absolute inset-0 hidden lg:block"
              style={{
                background:
                  'radial-gradient(ellipse 70% 45% at 100% 0%, color-mix(in srgb, var(--color-brand) 12%, transparent), transparent 55%)',
              }}
              aria-hidden
            />
            {formColumn}
          </div>
        </div>
      </div>
    );
  }

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
          <div className="ml-auto">{themeToggle}</div>
        </div>
      )}

      <div className={contentMax}>
        {children}
        {footer && !isFullscreen && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  );
}
