import { Lock } from 'lucide-react';
import Logo from './Logo';
import BrandName from './BrandName';

interface AuthLinearHeaderProps {
  /** Task line under the GymApure wordmark. */
  subtitle?: string;
}

export default function AuthLinearHeader({ subtitle }: AuthLinearHeaderProps) {
  return (
    <div className="auth-linear-header flex flex-col items-center">
      <div className="mb-3.5 inline-flex items-center gap-1.5 rounded-full border border-zinc-700/60 bg-zinc-800/50 px-2.5 py-0.5 text-[0.6875rem] font-medium tracking-wide text-zinc-400">
        <Lock className="h-3 w-3 text-zinc-500" />
        <span>Conexión cifrada</span>
      </div>

      <div className="relative mb-3 flex items-center justify-center">
        <Logo
          mode="dark"
          className="h-10 w-10 transition-transform duration-300 hover:scale-105"
          fetchPriority="high"
        />
      </div>

      <p className="text-[1.35rem] leading-tight font-semibold tracking-tight text-zinc-100">
        <BrandName variant="inline" size="md" onDark />
      </p>

      {subtitle ? (
        <h1 className="mt-1.5 text-[0.8125rem] leading-5 font-medium text-zinc-400">{subtitle}</h1>
      ) : (
        <h1 className="sr-only">GymApure</h1>
      )}
    </div>
  );
}
