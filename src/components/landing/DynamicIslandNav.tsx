import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion, useScroll } from 'framer-motion';
import { ChevronDown, Menu, X } from 'lucide-react';
import Logo from '../Logo';
import BrandName from '../BrandName';
import { Button } from '../ui';
import { cn } from '../../lib/utils';
import { useMediaQuery } from '../../lib/useMediaQuery';
import {
  LANDING_NAV_EXTRA,
  LANDING_NAV_LINKS,
  LANDING_NAV_PRIORITY,
  scrollToAnchor,
} from './landingNav';
import { getDemoRequestPath } from '../../config/landingContact';
import { LANDING_ISLAND_TOP } from './landingStyles';

type IslandMode = 'mini' | 'compact' | 'expanded';

export function DynamicIslandNav() {
  const location = useLocation();
  const isSm = useMediaQuery('(min-width: 640px)');
  const isLgNav = useMediaQuery('(min-width: 1024px)');
  const isXlNav = useMediaQuery('(min-width: 1280px)');
  const prefersReducedMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const demoPath = getDemoRequestPath();
  const isDemoPage = location.pathname === demoPath;

  const islandMode: IslandMode = isLgNav ? 'expanded' : isSm ? 'compact' : 'mini';
  const showHamburger = islandMode !== 'expanded';

  useEffect(() => {
    const unsubscribe = scrollY.on('change', (y) => {
      setScrolled(y > 24);
    });
    return unsubscribe;
  }, [scrollY]);

  useEffect(() => {
    setMenuOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

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
    if (!moreOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [moreOpen]);

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
    setMoreOpen(false);
    if (location.pathname !== '/') {
      window.location.href = `/${href}`;
      return;
    }
    scrollToAnchor(href);
  };

  const navLinkClass =
    'hover:text-brand rounded-full px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-zinc-600 transition-colors lg:text-sm dark:text-zinc-300';

  const demoCta = (
    <Link
      to={demoPath}
      className={cn(islandMode === 'mini' && 'shrink-0')}
      onClick={() => setMenuOpen(false)}
    >
      <Button
        size="sm"
        variant={isDemoPage ? 'secondary' : 'primary'}
        className={cn(
          'whitespace-nowrap',
          islandMode === 'mini' ? 'px-2.5 text-xs' : islandMode === 'compact' ? 'px-3' : ''
        )}
      >
        {islandMode === 'mini' ? 'Demo' : 'Solicitar demo'}
      </Button>
    </Link>
  );

  return (
    <header
      className={cn(
        'pointer-events-none fixed inset-x-0 z-50 flex justify-center px-3 sm:px-4',
        LANDING_ISLAND_TOP
      )}
    >
      <div
        className={cn(
          'relative',
          islandMode === 'expanded'
            ? 'w-full max-w-6xl'
            : 'w-fit max-w-[min(100%,calc(100%-1.5rem))]'
        )}
      >
        <motion.nav
          {...motionProps}
          className={cn(
            'pointer-events-auto flex items-center gap-1.5 rounded-full border shadow-lg backdrop-blur-xl sm:gap-2',
            islandMode === 'expanded' ? 'mx-auto w-full' : 'mx-auto',
            scrolled || isDemoPage
              ? 'border-white/[0.08] bg-zinc-950/80 ring-1 shadow-black/20 ring-white/[0.06] dark:border-white/[0.08] dark:bg-zinc-950/85'
              : 'border-zinc-200/60 bg-white/85 shadow-zinc-900/10 dark:border-white/10 dark:bg-zinc-900/75',
            islandMode === 'mini' ? 'px-2 py-1.5' : 'px-2.5 py-2 sm:px-3',
            islandMode === 'expanded' && 'px-3 py-2.5 lg:px-4'
          )}
          aria-label="Navegación principal"
        >
          <Link
            to="/"
            className="focus-visible:ring-brand/50 flex shrink-0 items-center gap-2 rounded-full outline-none focus-visible:ring-2"
            aria-label="GymApure inicio"
          >
            <Logo className={cn(islandMode === 'mini' ? 'h-7 w-7' : 'h-7 w-7 sm:h-8 sm:w-8')} />
            {islandMode !== 'mini' && (
              <BrandName size="sm" className="hidden text-base sm:inline" />
            )}
          </Link>

          {islandMode === 'expanded' && (
            <div className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex">
              {(isXlNav ? LANDING_NAV_LINKS : LANDING_NAV_PRIORITY).map((link) => (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => handleNavClick(link.href)}
                  className={navLinkClass}
                >
                  {link.label}
                </button>
              ))}

              {!isXlNav && (
                <div ref={moreRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setMoreOpen((o) => !o)}
                    className={cn(navLinkClass, 'inline-flex items-center gap-0.5')}
                    aria-expanded={moreOpen}
                    aria-haspopup="true"
                  >
                    Más
                    <ChevronDown
                      className={cn('h-3.5 w-3.5 transition-transform', moreOpen && 'rotate-180')}
                    />
                  </button>
                  {moreOpen && (
                    <div
                      className={cn(
                        'absolute top-[calc(100%+0.35rem)] left-1/2 z-50 min-w-[10rem] -translate-x-1/2 rounded-xl border p-1.5 shadow-xl',
                        'border-zinc-200/80 bg-white/95 dark:border-zinc-800 dark:bg-zinc-900/95'
                      )}
                    >
                      {LANDING_NAV_EXTRA.map((link) => (
                        <button
                          key={link.href}
                          type="button"
                          onClick={() => handleNavClick(link.href)}
                          className="hover:text-brand block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          {link.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
            {demoCta}

            {showHamburger && (
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
          {showHamburger && menuOpen && (
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
                'pointer-events-auto absolute top-[calc(100%+0.5rem)] right-0 max-h-[min(70dvh,22rem)] overflow-y-auto rounded-2xl border p-3 shadow-xl sm:w-[min(100%,20rem)]',
                islandMode === 'mini' ? 'left-0' : 'left-auto sm:left-auto',
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
                {!isDemoPage && (
                  <Link to={demoPath} className="mt-1 block" onClick={() => setMenuOpen(false)}>
                    <Button className="w-full" size="sm">
                      Solicitar demo
                    </Button>
                  </Link>
                )}
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
