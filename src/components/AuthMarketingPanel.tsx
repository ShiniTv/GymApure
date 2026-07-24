import BrandName from './BrandName';
import Logo from './Logo';

const HIGHLIGHTS = [
  'Gestión clara para tu equipo',
  'Operación diaria sin fricción',
  'Todo tu gimnasio, en un solo lugar',
] as const;

/** Panel de marca para auth en lg+ — presencia de producto, no herramientas de rol. */
export default function AuthMarketingPanel() {
  return (
    <aside
      className="auth-linear-marketing relative hidden min-h-dvh flex-col justify-between overflow-hidden px-10 py-12 text-white lg:flex xl:px-14"
      data-testid="auth-marketing"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(255,255,255,0.08),_transparent_55%)]"
        aria-hidden
      />

      <div className="relative z-10 animate-[auth-fade-in_200ms_ease-out]">
        <Logo
          mode="dark"
          fetchPriority="high"
          className="h-12 w-12 rounded-xl ring-1 ring-white/15"
        />
        <h2 className="mt-8 text-2xl font-semibold tracking-[-0.035em]">
          <BrandName variant="inline" onDark />
        </h2>
        <p className="mt-5 max-w-md text-[1.75rem] leading-[1.12] font-semibold tracking-[-0.04em] text-zinc-100 xl:text-[2.25rem]">
          La operación de tu gimnasio, enfocada.
        </p>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
          Un espacio de trabajo simple para administrar miembros, pagos y entrenamientos.
        </p>
      </div>

      <ul className="relative z-10 mt-12 max-w-sm animate-[auth-fade-in_200ms_ease-out] space-y-3">
        {HIGHLIGHTS.map((line) => (
          <li key={line} className="flex gap-3 text-sm text-zinc-300">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
