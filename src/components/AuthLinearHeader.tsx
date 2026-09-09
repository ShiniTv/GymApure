import Logo from './Logo';
import BrandName from './BrandName';

interface AuthLinearHeaderProps {
  /** Task line under the GymApure wordmark. */
  subtitle?: string;
}

export default function AuthLinearHeader({ subtitle }: AuthLinearHeaderProps) {
  return (
    <div className="auth-linear-header">
      <Logo mode="dark" className="mx-auto mb-4 h-10 w-10" fetchPriority="high" />
      <p className="text-[1.35rem] leading-tight font-semibold tracking-tight">
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
