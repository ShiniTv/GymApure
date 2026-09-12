import Logo from './Logo';

interface AuthLinearHeaderProps {
  /** Task line under the GymApure wordmark. */
  subtitle?: string;
}

export default function AuthLinearHeader({ subtitle }: AuthLinearHeaderProps) {
  return (
    <div className="auth-linear-header flex flex-col items-center">
      <div className="relative mb-3 flex items-center justify-center">
        <div className="flex h-13 w-13 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_10px_25px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-white/20">
          <Logo
            mode="dark"
            className="h-8 w-8 transition-transform duration-300"
            fetchPriority="high"
          />
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 leading-tight">
        <span className="text-xl font-bold tracking-tight text-white">Gym</span>
        <span className="text-brand text-xl font-bold tracking-tight">Apure</span>
      </div>

      {subtitle ? (
        <h1 className="mt-1 text-xs font-normal tracking-normal text-zinc-400">{subtitle}</h1>
      ) : (
        <h1 className="sr-only">GymApure</h1>
      )}
    </div>
  );
}
