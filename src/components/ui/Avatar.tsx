import { cn } from '../../lib/utils';
import { resolveAvatarUrl } from '../../lib/api';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-lg',
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export function Avatar({ src, name = '', size = 'md', className }: AvatarProps) {
  const resolved = src ? resolveAvatarUrl(src) : null;

  if (resolved) {
    return (
      <img
        src={resolved}
        alt={name || 'Avatar'}
        className={cn('rounded-full object-cover ring-2 ring-orange-500/20', sizeMap[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-500 font-semibold flex items-center justify-center ring-2 ring-orange-500/20',
        sizeMap[size],
        className
      )}
      aria-hidden={!name}
    >
      {initials(name || '?')}
    </div>
  );
}
