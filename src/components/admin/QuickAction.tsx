import { Link } from 'react-router-dom';
import { type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface QuickActionProps {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  count?: number;
  tone?: 'orange' | 'red' | 'blue' | 'emerald';
  compact?: boolean;
  /** En móvil muestra solo el icono (con badge si hay count). */
  iconOnlyMobile?: boolean;
  /** Breakpoint mínimo para mostrar la descripción (por defecto sm). */
  showDescriptionFrom?: 'sm' | 'md' | 'lg';
}

const toneMap = {
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-500 group-hover:bg-orange-500/20',
  red: 'bg-red-500/10 text-red-600 dark:text-red-500 group-hover:bg-red-500/20',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-500 group-hover:bg-blue-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 group-hover:bg-emerald-500/20',
};

const toneBadgeMap = {
  orange: 'bg-orange-500 text-white',
  red: 'bg-red-500 text-white',
  blue: 'bg-blue-500 text-white',
  emerald: 'bg-emerald-500 text-white',
};

export function QuickAction({
  to,
  icon: Icon,
  title,
  description,
  count,
  tone = 'orange',
  compact,
  iconOnlyMobile,
  showDescriptionFrom = 'sm',
}: QuickActionProps) {
  const showCount = count != null && count > 0;
  const descriptionFromClass =
    showDescriptionFrom === 'lg'
      ? 'hidden lg:block'
      : showDescriptionFrom === 'md'
        ? 'hidden md:block'
        : 'hidden sm:block';

  return (
    <Link
      to={to}
      aria-label={`${title}: ${description}`}
      title={title}
      className={cn(
        'group relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-orange-500/40 transition-all active:scale-[0.98] touch-manipulation',
        iconOnlyMobile
          ? 'flex max-sm:flex-col max-sm:items-center max-sm:justify-center max-sm:min-h-[56px] max-sm:py-2 max-sm:px-1 sm:flex-row sm:items-center sm:gap-2.5 sm:p-3 sm:min-h-[56px]'
          : cn(
              'flex items-center gap-2.5',
              compact ? 'p-3 min-h-[56px]' : 'items-start gap-4 p-5 min-h-[72px]'
            )
      )}
    >
      <div className={cn('relative shrink-0', iconOnlyMobile && 'max-sm:mx-auto')}>
        <div
          className={cn(
            'rounded-xl transition-colors',
            iconOnlyMobile ? 'max-sm:p-0 sm:p-2' : compact ? 'p-2' : 'p-3',
            toneMap[tone]
          )}
        >
          <Icon className={cn(iconOnlyMobile ? 'h-5 w-5' : compact ? 'h-4 w-4' : 'h-5 w-5')} />
        </div>
        {showCount && iconOnlyMobile && (
          <span
            className={cn(
              'absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 flex items-center justify-center rounded-full text-[8px] font-bold sm:hidden',
              toneBadgeMap[tone]
            )}
          >
            {count! > 99 ? '99+' : count}
          </span>
        )}
      </div>
      {iconOnlyMobile && (
        <span className="sm:hidden text-[9px] font-semibold text-zinc-600 dark:text-zinc-400 leading-none mt-1 truncate max-w-full text-center">
          {title}
        </span>
      )}
      <div className={cn('min-w-0 flex-1', iconOnlyMobile && 'hidden sm:block')}>
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              'font-semibold text-zinc-900 dark:text-white truncate',
              compact || iconOnlyMobile ? 'text-xs sm:text-sm' : 'text-sm'
            )}
          >
            {title}
          </p>
          {showCount && (
            <span
              className={cn(
                'min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-semibold shrink-0',
                toneBadgeMap[tone],
                iconOnlyMobile && 'hidden sm:flex'
              )}
            >
              {count! > 99 ? '99+' : count}
            </span>
          )}
        </div>
        <p
          className={cn(
            'text-zinc-500 dark:text-zinc-400',
            compact || iconOnlyMobile
              ? cn(descriptionFromClass, 'text-[11px] mt-0.5 line-clamp-1')
              : 'text-xs mt-1'
          )}
        >
          {description}
        </p>
      </div>
    </Link>
  );
}
