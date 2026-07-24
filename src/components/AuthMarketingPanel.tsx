import { BRAND } from '../config/brand';
import BrandName from './BrandName';
import Logo from './Logo';

const HIGHLIGHTS = [
  'Recepción y control de acceso en minutos',
  'Pagos con comprobante y tasa BCV',
  'Rutinas, clases y chat con miembros',
] as const;

/** Panel de marca para auth en lg+ — presencia de producto, no herramientas de rol. */
export default function AuthMarketingPanel() {
  return (
    <aside className="relative hidden min-h-dvh flex-col justify-between overflow-hidden bg-zinc-950 px-10 py-12 text-white lg:flex xl:px-14">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(249,115,22,0.22),_transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[-20%] bottom-[-10%] h-[55%] w-[55%] rounded-full bg-orange-500/10 blur-[100px]"
        aria-hidden
      />

      <div className="relative z-10 animate-[auth-fade-in_500ms_ease-out]">
        <Logo
          mode="dark"
          fetchPriority="high"
          className="ring-brand/30 h-16 w-16 shadow-lg ring-2 shadow-orange-500/10"
        />
        <h2 className="font-display mt-10 text-4xl font-extrabold tracking-tight xl:text-5xl">
          <BrandName variant="hero" onDark />
        </h2>
        <p className="mt-5 max-w-md text-xl leading-snug font-semibold text-zinc-100 xl:text-2xl">
          {BRAND.heroHeadline}
        </p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400 xl:text-base">
          {BRAND.heroSubheadline}
        </p>
      </div>

      <ul className="relative z-10 mt-12 max-w-sm animate-[auth-fade-in_700ms_ease-out] space-y-3">
        {HIGHLIGHTS.map((line) => (
          <li key={line} className="flex gap-3 text-sm text-zinc-300">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
