import Logo from './Logo';
import BrandName from './BrandName';
import { cn } from '../lib/utils';

interface AuthBrandHeaderProps {
  subtitle?: string;
  /** Texto de apoyo solo en lg+ cuando splitAware (p. ej. login). */
  formHint?: string;
  size?: 'md' | 'lg';
  className?: string;
  /**
   * En layout split (lg+): oculta logo/marca duplicados y deja el subtítulo como título del formulario.
   */
  splitAware?: boolean;
}

export default function AuthBrandHeader({
  subtitle,
  formHint,
  size = 'md',
  className,
  splitAware = false,
}: AuthBrandHeaderProps) {
  const logoSize = size === 'lg' ? 'h-16 w-16' : 'h-14 w-14';
  const titleSize = size === 'lg' ? 'lg' : 'md';

  return (
    <div className={cn('text-center', className)}>
      <div className={cn(splitAware && 'lg:hidden')}>
        <div className="mx-auto flex items-center justify-center">
          <Logo
            className={cn(
              logoSize,
              'ring-brand/20 shadow-brand/10 dark:ring-brand/25 dark:shadow-brand/15 shadow-lg ring-2'
            )}
          />
        </div>
        <h1 className="mt-6">
          <BrandName variant="inline" size={titleSize === 'lg' ? 'lg' : 'md'} />
        </h1>
        {subtitle && <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
      </div>

      {splitAware && subtitle && (
        <div className="hidden lg:block lg:text-left">
          <p className="text-brand mb-3 text-[11px] font-semibold tracking-[0.16em] uppercase">
            Acceso seguro
          </p>
          <h1 className="font-display text-[1.75rem] leading-tight font-extrabold tracking-tight text-zinc-900 xl:text-[2rem] dark:text-white">
            {subtitle}
          </h1>
          {formHint && (
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {formHint}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
