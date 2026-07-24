import { type ReactNode } from 'react';
import { cn } from '../lib/utils';

interface AuthFormSurfaceProps {
  children: ReactNode;
  className?: string;
  /** Register usa spacing un poco más compacto. */
  compact?: boolean;
}

/**
 * Móvil/tablet: card elevada.
 * Desktop (lg+): superficie limpia sin card (estilo Linear/Vercel).
 */
export default function AuthFormSurface({
  children,
  className,
  compact = false,
}: AuthFormSurfaceProps) {
  return (
    <div
      className={cn(
        compact ? 'page-stack' : 'page-stack-loose',
        'relative mt-8 w-full sm:mt-10 lg:mt-0',
        // Card below lg
        'auth-form-card overflow-hidden rounded-2xl p-5 sm:p-6',
        // Bare form on desktop
        'lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0 dark:lg:bg-transparent',
        className
      )}
    >
      <div className="auth-form-card-accent lg:hidden" aria-hidden />
      {children}
    </div>
  );
}
