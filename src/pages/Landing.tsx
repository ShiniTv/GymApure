import { Link } from 'react-router';
import { BRAND } from '../config/brand';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn } from '../lib/utils';
import { typography } from '../lib/typography';

const ctaPrimary = cn(
  typography.button,
  'inline-flex h-12 min-h-[var(--touch-min)] items-center justify-center rounded-button bg-brand px-6 text-white shadow-sm shadow-brand/20 transition-colors hover:bg-brand-hover dark:text-zinc-950'
);
const ctaSecondary = cn(
  typography.button,
  'inline-flex h-12 min-h-[var(--touch-min)] items-center justify-center rounded-button border border-white/25 bg-black/35 px-6 text-white backdrop-blur-sm transition-colors hover:bg-black/50'
);

/**
 * Public landing — one composition: full-bleed gym photo, brand hero, one CTA group.
 */
export default function Landing() {
  usePageTitle(BRAND.pageTitle);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-zinc-950 text-white">
      <img
        src="/landing-hero-gym.png"
        alt=""
        className="landing-hero-img absolute inset-0 h-full w-full object-cover"
        decoding="async"
        fetchPriority="high"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-zinc-950/55 via-zinc-950/50 to-zinc-950/90"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in_oklab,#0c98ff_22%,transparent),_transparent_55%)]"
        aria-hidden
      />

      <header className="relative z-10 flex items-center justify-between px-4 py-5 sm:px-8">
        <p className="landing-brand font-display text-2xl font-bold tracking-tight sm:text-3xl">
          <span className="text-white">{BRAND.nameParts.primary}</span>
          <span className="text-brand">{BRAND.nameParts.accent}</span>
        </p>
        <Link
          to="/login"
          className="text-sm font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline"
        >
          Iniciar sesión
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-end px-4 pb-16 sm:justify-center sm:px-8 sm:pb-20">
        <h1 className="landing-headline font-display text-4xl leading-[1.08] font-bold tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
          {BRAND.heroHeadline}
        </h1>
        <p className="landing-support mt-4 max-w-xl text-base text-white/75 sm:text-lg">
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
