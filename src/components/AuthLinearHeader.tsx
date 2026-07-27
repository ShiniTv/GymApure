import Logo from './Logo';

interface AuthLinearHeaderProps {
  title: string;
  subtitle: string;
}

/** Shared, restrained header for public authentication flows. */
export default function AuthLinearHeader({ title, subtitle }: AuthLinearHeaderProps) {
  return (
    <div className="auth-linear-header">
      <Logo mode="dark" className="mx-auto h-13 w-13" fetchPriority="high" />
      <h1 className="mt-5 text-[1.75rem] leading-none font-semibold tracking-[-0.04em] text-zinc-50">
        {title}
      </h1>
      <p className="mx-auto mt-2.5 max-w-[18rem] text-[13px] leading-5 text-zinc-400">{subtitle}</p>
    </div>
  );
}
