import { Link } from 'react-router';
import { BRAND } from '../config/brand';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn } from '../lib/utils';
import { typography } from '../lib/typography';

const ctaPrimary = cn(
  typography.button,
  'inline-flex h-12 min-h-[var(--touch-min)] items-center justify-center rounded-button bg-brand px-6 text-white shadow-sm shadow-brand/20 transition-colors hover:bg-brand-hover dark:text-text-inverse'
);
const ctaSecondary = cn(
  typography.button,
  'inline-flex h-12 min-h-[var(--touch-min)] items-center justify-center rounded-button border border-border bg-surface/90 px-6 text-text backdrop-blur-sm transition-colors hover:bg-surface-raised'
);

/**
 * Public landing — full-bleed gym photo + brand hero.
 * Respects user light/dark (no forced `.dark`); photo scrim keeps type readable.
 */
export default function Landing() {
  usePageTitle(BRAND.pageTitle);

  return (
    <div className="bg-bg text-text relative flex min-h-dvh flex-col overflow-hidden">
      <img
        src="/landing-hero-gym.png"
        alt=""
        className="landing-hero-img absolute inset-0 h-full w-full object-cover"
        decoding="async"
        fetchPriority="high"
      />
      <div className="from-bg/70 via-bg/55 to-bg absolute inset-0 bg-gradient-to-b" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in_oklab,var(--color-brand)_18%,transparent),_transparent_55%)]"
        aria-hidden
      />

      <header className="relative z-10 flex items-center justify-between px-4 py-5 sm:px-8">
        <p className="landing-brand font-display text-2xl font-bold tracking-tight sm:text-3xl">
          <span className="text-text">{BRAND.nameParts.primary}</span>
          <span className="text-brand">{BRAND.nameParts.accent}</span>
        </p>
        <Link
          to="/login"
          className="text-text-secondary hover:text-text text-sm font-semibold underline-offset-4 hover:underline"
        >
          Iniciar sesión
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-end px-4 pb-16 sm:justify-center sm:px-8 sm:pb-20">
        <h1 className="landing-headline font-display text-text text-4xl leading-[1.08] font-bold tracking-[-0.03em] sm:text-5xl lg:text-6xl">
          {BRAND.heroHeadline}
        </h1>
        <p className="landing-support text-text-secondary mt-4 max-w-xl text-base sm:text-lg">
          {BRAND.heroSubheadline}
        </p>
        <div className="landing-ctas mt-8 flex flex-wrap items-center gap-3">
          <Link to="/solicitar-demo" className={ctaPrimary}>
            Solicitar demo
          </Link>
          <Link to="/login" className={ctaSecondary}>
            Entrar al panel
          </Link>
        </div>
      </main>
    </div>
  );
}
