import Logo from './Logo';
import BrandName from './BrandName';
import { cn } from '../lib/utils';

interface AuthBrandHeaderProps {
  subtitle?: string;
  size?: 'md' | 'lg';
  className?: string;
}

export default function AuthBrandHeader({ subtitle, size = 'md', className }: AuthBrandHeaderProps) {
  const logoSize = size === 'lg' ? 'h-16 w-16' : 'h-14 w-14';
  const titleSize = size === 'lg' ? 'lg' : 'md';

  return (
    <div className={cn('text-center', className)}>
      <div className="mx-auto flex items-center justify-center">
        <Logo
          className={cn(
            logoSize,
            'ring-2 ring-brand/20 shadow-lg shadow-brand/10 dark:ring-brand/25 dark:shadow-brand/15'
          )}
        />
      </div>
      <h1 className="mt-6">
        <BrandName variant="inline" size={titleSize === 'lg' ? 'lg' : 'md'} />
      </h1>
      {subtitle && (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      )}
    </div>
  );
}
