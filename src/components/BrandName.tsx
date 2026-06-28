import { cn } from '../lib/utils';
import { BRAND } from '../config/brand';

type BrandNameVariant = 'split' | 'inline' | 'plain';
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
  if (variant === 'plain') {
    return (
      <span className={cn(className)}>
        {BRAND.name}
      </span>
    );
  }

  if (variant === 'split') {
    return (
      <span className={cn('flex flex-col leading-none min-w-0', className)}>
        <span className={cn(
          'text-sm font-bold tracking-tight truncate',
          onDark ? 'text-white' : 'text-zinc-900 dark:text-white'
        )}>
          {BRAND.nameParts.primary}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand -mt-px truncate">
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
