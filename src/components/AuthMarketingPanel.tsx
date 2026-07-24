import { BRAND } from '../config/brand';
import BrandName from './BrandName';
import Logo from './Logo';

const HIGHLIGHTS = [
  'Recepción y control de acceso en minutos',
  'Pagos con comprobante y tasa BCV',
  'Rutinas, clases y chat con miembros',
] as const;

/** Panel de marca lg+ — atmósfera + acentos del tema activo (--color-brand). */
export default function AuthMarketingPanel() {
  return (
    <aside className="relative hidden min-h-dvh flex-col overflow-hidden bg-zinc-950 text-white lg:flex">
      <img
        src={BRAND.authAtmosphere}
        alt=""
        width={1600}
        height={900}
        decoding="async"
        fetchPriority="low"
        className="pointer-events-none absolute inset-0 h-full w-full animate-[auth-ken-burns_28s_ease-out_forwards] object-cover object-center"
        aria-hidden
      />
      {/* Lectura: oscurece imagen sin teñir de naranja fijo */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-zinc-950/95 via-zinc-950/80 to-zinc-950/45"
        aria-hidden
      />
      {/* Tinte del brand del sistema (océano, ámbar, etc.) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 0% 0%, color-mix(in srgb, var(--color-brand) 32%, transparent), transparent 60%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"
        aria-hidden
      />

      <div className="relative z-10 flex flex-1 flex-col justify-center gap-10 px-10 py-14 xl:px-14 xl:py-16">
        <div className="animate-[auth-fade-in_500ms_ease-out]">
          <div className="flex items-center gap-4">
            <Logo
              mode="dark"
              fetchPriority="high"
              className="ring-brand/40 h-14 w-14 shadow-lg ring-2 shadow-black/30"
            />
            <h2 className="font-display text-3xl font-extrabold tracking-tight xl:text-4xl">
              <BrandName variant="hero" onDark />
            </h2>
          </div>

          <p className="mt-8 max-w-md text-2xl leading-snug font-semibold text-balance text-zinc-50 xl:text-3xl">
            {BRAND.heroHeadline}
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-300 xl:text-base">
            {BRAND.heroSubheadline}
          </p>
        </div>

        <ul className="max-w-sm animate-[auth-fade-in_700ms_ease-out] space-y-3.5">
          {HIGHLIGHTS.map((line) => (
            <li key={line} className="flex gap-3 text-sm text-zinc-200">
              <span
                className="bg-brand mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full shadow-[0_0_12px_color-mix(in_srgb,var(--color-brand)_55%,transparent)]"
                aria-hidden
              />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 px-10 pb-10 text-xs tracking-wide text-zinc-500 uppercase xl:px-14">
        {BRAND.tagline}
      </p>
    </aside>
  );
}
