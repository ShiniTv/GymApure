import Logo from './Logo';
import { cn } from '../lib/utils';

interface AuthBrandHeaderProps {
  subtitle?: string;
  size?: 'md' | 'lg';
  className?: string;
}

export default function AuthBrandHeader({ subtitle, size = 'md', className }: AuthBrandHeaderProps) {
  const logoSize = size === 'lg' ? 'h-14 w-14' : 'h-12 w-12';
  const badgeSize = size === 'lg' ? 'h-24 w-24' : 'h-20 w-20';
  const titleSize = size === 'lg' ? 'text-4xl' : 'text-3xl';

  return (
    <div className={cn('text-center', className)}>
      <div
        className={cn(
          'mx-auto flex items-center justify-center rounded-full bg-orange-500/10 ring-1 ring-orange-500/50',
          badgeSize
        )}
      >
        <Logo className={logoSize} />
      </div>
      <h1
        className={cn(
          'mt-6 font-black tracking-tighter text-zinc-900 dark:text-white uppercase italic',
          titleSize
        )}
      >
        CARIBEAN <span className="text-orange-500">GYM</span>
      </h1>
      {subtitle && (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      )}
    </div>
  );
}
