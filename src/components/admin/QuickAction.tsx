import { Link } from 'react-router';
import { type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { queryClient } from '../../lib/queryClient';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import { paymentsQueryKey } from '../../hooks/queries/usePaymentsQuery';
import { prefetchRoute } from '../../lib/routePrefetch';

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
  brand: 'text-brand',
  orange: 'text-orange-600 dark:text-orange-500',
  red: 'text-red-600 dark:text-red-500',
  blue: 'text-blue-600 dark:text-blue-500',
  emerald: 'text-emerald-600 dark:text-emerald-500',
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
    prefetchRoute(to);
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
        'group border-border/60 bg-surface hover:bg-surface-raised/80 tap-feedback relative touch-manipulation rounded-[var(--radius-card)] border transition-colors duration-150',
        iconOnlyMobile
          ? 'flex max-sm:min-h-[var(--touch-min)] max-sm:flex-col max-sm:items-center max-sm:justify-center max-sm:px-1 max-sm:py-2 sm:min-h-0 sm:flex-row sm:items-center sm:gap-2.5 sm:px-3 sm:py-2.5'
          : cn(
              'flex items-center gap-2.5',
              compact
                ? 'min-h-[var(--touch-min)] px-3 py-2.5 sm:min-h-0'
                : 'min-h-[72px] items-start gap-3 p-4'
            )
      )}
    >
      <div className={cn('relative shrink-0', iconOnlyMobile && 'max-sm:mx-auto')}>
        <Icon className={cn('h-4 w-4', toneMap[tone])} aria-hidden />
        {showCount && iconOnlyMobile && (
          <span className="bg-danger absolute -top-1.5 -right-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[8px] font-bold text-white sm:hidden">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>
      {iconOnlyMobile && (
        <span className="text-text-secondary mt-1 max-w-full truncate text-center text-[10px] leading-tight font-medium sm:hidden">
          {title}
        </span>
      )}
      <div className={cn('min-w-0 flex-1', iconOnlyMobile && 'hidden sm:block')}>
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              'text-text truncate font-medium',
              compact || iconOnlyMobile ? 'text-xs sm:text-sm' : 'text-sm'
            )}
          >
            {title}
          </p>
          {showCount && (
            <span
              className={cn(
                'bg-surface-overlay text-text-secondary rounded-chip flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center px-1.5 text-[10px] font-semibold',
                iconOnlyMobile && 'hidden sm:flex'
              )}
            >
              {count > 99 ? '99+' : count}
            </span>
          )}
        </div>
        <p
          className={cn(
            'text-text-muted',
            compact || iconOnlyMobile
              ? cn(descriptionFromClass, 'mt-0.5 line-clamp-1 text-[11px]')
              : 'mt-0.5 text-xs'
          )}
        >
          {description}
        </p>
      </div>
    </Link>
  );
}
