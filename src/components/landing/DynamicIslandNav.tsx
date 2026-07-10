import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion, useScroll } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Logo from '../Logo';
import BrandName from '../BrandName';
import { Button } from '../ui';
import { cn } from '../../lib/utils';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { LANDING_NAV_LINKS, scrollToAnchor } from './landingNav';
import { getDemoRequestPath } from '../../config/landingContact';

export function DynamicIslandNav() {
  const isWideNav = useMediaQuery('(min-width: 1280px)');
  const prefersReducedMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const compact = !isWideNav || scrolled;

  useEffect(() => {
    const unsubscribe = scrollY.on('change', (y) => {
      setScrolled(y > 64);
    });
    return unsubscribe;
  }, [scrollY]);

  useEffect(() => {
    setMenuOpen(false);
  }, [scrolled]);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen || !menuRef.current) return;
    const sheet = menuRef.current;
    const focusables = sheet.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    requestAnimationFrame(() => first?.focus());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab' || focusables.length === 0) return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const motionProps = prefersReducedMotion
    ? {}
    : {
        layout: true as const,
        transition: { type: 'spring' as const, stiffness: 400, damping: 32 },
      };

  const handleNavClick = (href: string) => {
    setMenuOpen(false);
    scrollToAnchor(href);
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex justify-center px-3 sm:px-4">
      <div className="relative w-full max-w-6xl">
        <motion.nav
          {...motionProps}
          className={cn(
            'pointer-events-auto mx-auto flex w-full items-center gap-1.5 rounded-full border shadow-lg shadow-zinc-900/10 backdrop-blur-xl sm:gap-2',
            'border-zinc-200/60 bg-white/85 dark:border-white/10 dark:bg-zinc-900/80',
            compact ? 'px-2.5 py-2 sm:px-3' : 'px-3 py-2.5 xl:px-4'
          )}
          aria-label="Navegación principal"
        >
          <Link
            to="/"
            className="focus-visible:ring-brand/50 flex shrink-0 items-center gap-2 rounded-full outline-none focus-visible:ring-2"
            aria-label="GymApure inicio"
          >
            <Logo className="h-7 w-7 sm:h-8 sm:w-8" />
            {!compact && <BrandName size="sm" className="hidden text-base sm:inline" />}
          </Link>

          {!compact && (
            <div className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex">
              {LANDING_NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => handleNavClick(link.href)}
                  className="hover:text-brand rounded-full px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-zinc-600 transition-colors xl:px-3 xl:text-sm dark:text-zinc-300"
                >
                  {link.label}
                </button>
              ))}
            </div>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            {!compact && (
              <Link to={getDemoRequestPath()} className="hidden sm:block">
                <Button size="sm" variant="primary" className="whitespace-nowrap">
                  Solicitar demo
                </Button>
              </Link>
            )}

            {compact && (
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="hover:text-brand inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 sm:h-10 sm:w-10 dark:text-zinc-300 dark:hover:bg-zinc-800"
                aria-expanded={menuOpen}
                aria-controls="landing-island-menu"
                aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              >
                {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            )}
          </div>
        </motion.nav>

        <AnimatePresence>
          {compact && menuOpen && (
            <motion.div
              ref={menuRef}
              id="landing-island-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Menú de navegación"
              initial={prefersReducedMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'pointer-events-auto absolute top-[calc(100%+0.5rem)] right-0 left-0 max-h-[min(70dvh,22rem)] overflow-y-auto rounded-2xl border p-3 shadow-xl sm:left-auto sm:w-[min(100%,20rem)]',
                'border-zinc-200/80 bg-white/95 dark:border-zinc-800 dark:bg-zinc-900/95'
              )}
            >
              <div className="flex flex-col gap-1">
                {LANDING_NAV_LINKS.map((link) => (
                  <button
                    key={link.href}
                    type="button"
                    onClick={() => handleNavClick(link.href)}
                    className="hover:text-brand min-h-11 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {link.label}
                  </button>
                ))}
                <Link
                  to={getDemoRequestPath()}
                  className="mt-1 block"
                  onClick={() => setMenuOpen(false)}
                >
                  <Button className="w-full" size="sm">
                    Solicitar demo
                  </Button>
                </Link>
                <Link
                  to="/login"
                  className="hover:text-brand mt-1 flex min-h-11 items-center justify-center text-sm font-medium text-zinc-500 dark:text-zinc-400"
                  onClick={() => setMenuOpen(false)}
                >
                  Iniciar sesión
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
