import Logo from './Logo';

interface AuthLinearHeaderProps {
  title: string;
  subtitle: string;
}

/** Shared, restrained header for public authentication flows. */
export default function AuthLinearHeader({ title, subtitle }: AuthLinearHeaderProps) {
  return (
    <div className="auth-linear-header">
      <Logo mode="dark" className="mx-auto h-16 w-16" fetchPriority="high" />
      <h1 className="mt-7 text-[2rem] leading-none font-semibold tracking-[-0.045em] text-zinc-50">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{subtitle}</p>
    </div>
  );
}
