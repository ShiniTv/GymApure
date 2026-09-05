import Logo from './Logo';

interface AuthLinearHeaderProps {
  title: string;
  subtitle?: string;
}

export default function AuthLinearHeader({ title, subtitle }: AuthLinearHeaderProps) {
  return (
    <div className="auth-linear-header">
      <Logo mode="dark" className="mx-auto mb-5 h-10 w-10" fetchPriority="high" />
      <h1 className="text-[1.25rem] leading-tight font-semibold tracking-[-0.02em] text-zinc-50">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1.5 text-[0.8125rem] leading-5 text-zinc-500">{subtitle}</p>
      ) : null}
    </div>
  );
}
