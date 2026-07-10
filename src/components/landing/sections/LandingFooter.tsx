import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import Logo from '../../Logo';
import BrandName from '../../BrandName';
import { BRAND } from '../../../config/brand';
import { useTheme } from '../../../context/ThemeContext';
import { parseJsonSafe } from '../../../lib/api';
import { getDemoRequestPath } from '../../../config/landingContact';
import { LANDING_CONTAINER_MD } from '../landingStyles';
import { cn } from '../../../lib/utils';

export function LandingFooter() {
  const { theme, toggleTheme } = useTheme();
  const [registerAllowed, setRegisterAllowed] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => parseJsonSafe<{ allowPublicRegister?: boolean }>(res))
      .then((data) => setRegisterAllowed(data.allowPublicRegister !== false))
      .catch(() => setRegisterAllowed(false));
  }, []);

  return (
    <footer className="border-t border-zinc-200/60 bg-zinc-100/40 px-4 py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-12 dark:border-white/[0.06] dark:bg-zinc-950/80">
      <div
        className={cn(
          LANDING_CONTAINER_MD,
          'flex flex-col gap-8 md:flex-row md:items-start md:justify-between'
        )}
      >
        <div className="flex items-start gap-3">
          <Logo className="h-9 w-9 shrink-0" />
          <div className="min-w-0">
            <BrandName size="sm" className="text-lg" />
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {BRAND.tagline}
            </p>
          </div>
        </div>

        <nav
          className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:flex sm:flex-col"
          aria-label="Enlaces del pie de página"
        >
          <Link
            to={getDemoRequestPath()}
            className="hover:text-brand flex min-h-10 items-center text-zinc-600 transition-colors dark:text-zinc-400"
          >
            Solicitar demo
          </Link>
          <Link
            to="/login"
            className="hover:text-brand flex min-h-10 items-center text-zinc-600 transition-colors dark:text-zinc-400"
          >
            Iniciar sesión
          </Link>
          {registerAllowed && (
            <Link
              to="/register"
              className="hover:text-brand flex min-h-10 items-center text-zinc-600 transition-colors dark:text-zinc-400"
            >
              Registrarse
            </Link>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            className={cn(
              'hover:text-brand col-span-2 inline-flex min-h-10 items-center gap-2 text-left text-zinc-600 transition-colors sm:col-span-1 dark:text-zinc-400'
            )}
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
          </button>
        </nav>
      </div>

      <p
        className={cn(
          LANDING_CONTAINER_MD,
          'mt-8 text-center text-xs text-zinc-400 dark:text-zinc-500'
        )}
      >
        © {new Date().getFullYear()} {BRAND.name}. Todos los derechos reservados.
      </p>
    </footer>
  );
}
