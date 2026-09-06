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
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
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
        loading="lazy"
        decoding="async"
        className={cn('ring-brand/20 rounded-full object-cover ring-2', sizeMap[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'bg-surface-overlay text-text ring-border dark:bg-brand/10 dark:text-brand dark:ring-brand/20 flex items-center justify-center rounded-full font-semibold ring-2',
        sizeMap[size],
        className
      )}
      aria-hidden={!name}
    >
      {initials(name || '?')}
    </div>
  );
}
