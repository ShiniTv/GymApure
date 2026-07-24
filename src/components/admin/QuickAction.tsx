import { Link } from 'react-router';
import { type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { queryClient } from '../../lib/queryClient';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import { paymentsQueryKey } from '../../hooks/queries/usePaymentsQuery';

interface QuickActionProps {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  count?: number;
  tone?: 'brand' | 'orange' | 'red' | 'blue' | 'emerald';
  compact?: boolean;
  /** En móvil muestra solo el icono (con badge si hay count). */
  iconOnlyMobile?: boolean;
  /** Breakpoint mínimo para mostrar la descripción (por defecto sm). */
  showDescriptionFrom?: 'sm' | 'md' | 'lg';
  /** Prefetch pending payments list on hover/focus (staff pagos shortcut). */
  prefetchPaymentsPending?: boolean;
}

const toneMap = {
  brand: 'bg-brand/10 text-brand group-hover:bg-brand/20',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-500 group-hover:bg-orange-500/20',
  red: 'bg-red-500/10 text-red-600 dark:text-red-500 group-hover:bg-red-500/20',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-500 group-hover:bg-blue-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 group-hover:bg-emerald-500/20',
};

const toneBadgeMap = {
  brand: 'brand-solid',
  orange: 'bg-orange-500 text-white',
  red: 'bg-red-500 text-white',
  blue: 'bg-blue-500 text-white',
  emerald: 'bg-emerald-500 text-white',
};

function prefetchPendingPayments() {
  const params = { page: 1, pageSize: 20, statusFilter: 'pending' };
  void queryClient.prefetchQuery({
    queryKey: paymentsQueryKey(params),
    queryFn: async () => {
      const qs = new URLSearchParams({
        page: '1',
        limit: '20',
        status: 'pending',
      });
      const res = await apiFetch(`/api/payments?${qs.toString()}`);
      return parseJsonResponse(res);
    },
  });
}

export function QuickAction({
  to,
  icon: Icon,
  title,
  description,
  count,
  tone = 'brand',
  compact,
  iconOnlyMobile,
  showDescriptionFrom = 'sm',
  prefetchPaymentsPending,
}: QuickActionProps) {
  const showCount = count != null && count > 0;
  const descriptionFromClass =
    showDescriptionFrom === 'lg'
      ? 'hidden lg:block'
      : showDescriptionFrom === 'md'
        ? 'hidden md:block'
        : 'hidden sm:block';

  const maybePrefetch = () => {
    if (prefetchPaymentsPending || to.includes('/payments')) {
      prefetchPendingPayments();
    }
  };

  return (
    <Link
      to={to}
      aria-label={`${title}: ${description}`}
      title={title}
      onMouseEnter={maybePrefetch}
      onFocus={maybePrefetch}
      className={cn(
        'group hover:border-brand/20 tap-feedback relative touch-manipulation rounded-xl border border-zinc-200 bg-white transition-[box-shadow,border-color,transform,opacity] duration-150 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900',
        iconOnlyMobile
          ? 'flex max-sm:min-h-[56px] max-sm:flex-col max-sm:items-center max-sm:justify-center max-sm:px-1 max-sm:py-2 sm:min-h-[56px] sm:flex-row sm:items-center sm:gap-2.5 sm:p-3'
          : cn(
              'flex items-center gap-2.5',
              compact ? 'min-h-[56px] p-3' : 'min-h-[72px] items-start gap-4 p-5'
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
              'absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[8px] font-bold sm:hidden',
              toneBadgeMap[tone]
            )}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>
      {iconOnlyMobile && (
        <span className="mt-1 max-w-full truncate text-center text-[10px] leading-tight font-semibold text-zinc-700 sm:hidden dark:text-zinc-300">
          {title}
        </span>
      )}
      <div className={cn('min-w-0 flex-1', iconOnlyMobile && 'hidden sm:block')}>
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              'truncate font-semibold text-zinc-900 dark:text-white',
              compact || iconOnlyMobile ? 'text-xs sm:text-sm' : 'text-sm'
            )}
          >
            {title}
          </p>
          {showCount && (
            <span
              className={cn(
                'flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold',
                toneBadgeMap[tone],
                iconOnlyMobile && 'hidden sm:flex'
              )}
            >
              {count > 99 ? '99+' : count}
            </span>
          )}
        </div>
        <p
          className={cn(
            'text-zinc-500 dark:text-zinc-400',
            compact || iconOnlyMobile
              ? cn(descriptionFromClass, 'mt-0.5 line-clamp-1 text-[11px]')
              : 'mt-1 text-xs'
          )}
        >
          {description}
        </p>
      </div>
    </Link>
  );
}
