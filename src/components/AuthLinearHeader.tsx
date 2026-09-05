import Logo from './Logo';

interface AuthLinearHeaderProps {
  title: string;
  subtitle: string;
}

/** Shared, restrained header for public authentication flows. */
export default function AuthLinearHeader({ title, subtitle }: AuthLinearHeaderProps) {
  return (
    <div className="auth-linear-header">
      <Logo mode="dark" className="mx-auto h-11 w-11" fetchPriority="high" />
      <h1 className="mt-4 text-xl leading-tight font-semibold tracking-[-0.02em] text-zinc-50">
        {title}
      </h1>
      <p className="mx-auto mt-2 max-w-[18rem] text-sm leading-5 text-zinc-400">{subtitle}</p>
    </div>
  );
}
