import { cn } from '../lib/utils';
import { BRAND } from '../config/brand';

type BrandNameVariant = 'split' | 'inline' | 'plain' | 'hero';
type BrandNameSize = 'sm' | 'md' | 'lg';

interface BrandNameProps {
  variant?: BrandNameVariant;
  size?: BrandNameSize;
  className?: string;
  /** Light text for dark backgrounds (e.g. kiosk header) */
  onDark?: boolean;
}

const inlineSizeClasses: Record<BrandNameSize, string> = {
  sm: 'text-sm',
  md: 'text-3xl',
  lg: 'text-4xl sm:text-5xl',
};

export default function BrandName({
  variant = 'inline',
  size = 'md',
  className,
  onDark = false,
}: BrandNameProps) {
  if (variant === 'hero') {
    return (
      <span className={cn('font-display font-extrabold tracking-tight', className)}>
        <span className={onDark ? 'text-white' : 'text-zinc-900 dark:text-white'}>
          {BRAND.nameParts.primary}
        </span>
        <span className="text-brand">{BRAND.nameParts.accent}</span>
      </span>
    );
  }

  if (variant === 'plain') {
    return <span className={cn(className)}>{BRAND.name}</span>;
  }

  if (variant === 'split') {
    return (
      <span className={cn('flex min-w-0 flex-col leading-none', className)}>
        <span
          className={cn(
            'truncate text-sm font-bold tracking-tight',
            onDark ? 'text-white' : 'text-zinc-900 dark:text-white'
          )}
        >
          {BRAND.nameParts.primary}
        </span>
        <span className="text-brand -mt-px truncate text-[10px] font-semibold tracking-[0.14em] uppercase">
          {BRAND.nameParts.accent}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'font-bold tracking-tight',
        onDark ? 'text-white' : 'text-zinc-900 dark:text-white',
        inlineSizeClasses[size],
        className
      )}
    >
      {BRAND.nameParts.primary}
      <span className={onDark ? 'text-zinc-300' : 'text-brand'}>{BRAND.nameParts.accent}</span>
    </span>
  );
}
