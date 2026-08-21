import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '../../lib/utils';
import { Card } from './Card';
import type { TrendTone } from '../../lib/dashboardTrends';

type StatColor = 'emerald' | 'blue' | 'brand' | 'orange' | 'red';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendTone?: TrendTone;
  color?: StatColor;
  className?: string;
  compact?: boolean;
  /**
   * Con icono lateral tintado. Por defecto false: layout minimal (tipo + número)
   * para grids densos de Operate. Usa `withIcon` solo si el dato es accionable.
   */
  withIcon?: boolean;
  /** @deprecated Preferir el default minimal; `withIcon` restaura el chip. */
  minimal?: boolean;
  /** Si se define, la tarjeta completa es un enlace. */
  to?: string;
}

const colorMap: Record<StatColor, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-500 bg-emerald-500/10',
  blue: 'text-blue-600 dark:text-blue-500 bg-blue-500/10',
  brand: 'text-brand bg-brand/10',
  orange: 'text-orange-600 dark:text-orange-500 bg-orange-500/10',
  red: 'text-red-600 dark:text-red-500 bg-red-500/10',
};

function StatCardContent({
  title,
  value,
  icon: Icon,
  trend,
  trendTone = 'up',
  color = 'brand',
  compact,
  minimal,
}: Omit<StatCardProps, 'className' | 'to' | 'withIcon'>) {
  if (minimal) {
    return (
      <>
        <p className="text-text-muted text-[10px] leading-tight font-medium tracking-wide uppercase">
          {title}
        </p>
        <p className="text-text mt-0.5 text-lg font-semibold tabular-nums sm:text-xl">{value}</p>
        {trend ? (
          <span
            className={cn(
              'mt-1 flex items-center gap-0.5 text-[10px] font-medium',
              trendTone === 'up' && 'text-success',
              trendTone === 'down' && 'text-danger',
              trendTone === 'neutral' && 'text-text-muted'
            )}
          >
            {trendTone === 'up' && <TrendingUp className="h-3 w-3" />}
            {trendTone === 'down' && <TrendingDown className="h-3 w-3" />}
            {trendTone === 'neutral' && <Minus className="h-3 w-3" />}
            {trend}
          </span>
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-1 items-start justify-between gap-1.5 sm:gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'stat-label mb-1 leading-snug break-words',
              compact && 'text-[10px] leading-tight tracking-normal sm:tracking-wide'
            )}
          >
            {title}
          </p>
          <p className={cn('stat-value tabular-nums', compact && 'text-lg sm:text-2xl')}>{value}</p>
        </div>
        <div
          className={cn(
            'shrink-0 rounded-lg',
            compact ? 'hidden p-2 sm:flex' : 'p-2.5',
            colorMap[color]
          )}
        >
          <Icon className={cn(compact ? 'h-4 w-4' : 'h-5 w-5')} />
        </div>
      </div>
      <div
        className={cn('flex min-h-[1.125rem] items-center', compact ? 'mt-1.5' : 'mt-3')}
        aria-hidden={!trend}
      >
        {trend ? (
          <span
            className={cn(
              'flex items-center gap-0.5 font-medium',
              compact ? 'text-[10px] leading-tight' : 'text-xs sm:text-sm',
              trendTone === 'up' && 'text-success',
              trendTone === 'down' && 'text-danger',
              trendTone === 'neutral' && 'text-text-muted'
            )}
          >
            {trendTone === 'up' && <TrendingUp className={cn(compact ? 'h-3 w-3' : 'h-4 w-4')} />}
            {trendTone === 'down' && (
              <TrendingDown className={cn(compact ? 'h-3 w-3' : 'h-4 w-4')} />
            )}
            {trendTone === 'neutral' && <Minus className={cn(compact ? 'h-3 w-3' : 'h-4 w-4')} />}
            {trend}
          </span>
        ) : null}
      </div>
    </>
  );
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  trendTone = 'up',
  color = 'brand',
  className,
  compact,
  minimal,
  withIcon = false,
  to,
}: StatCardProps) {
  const useMinimal = minimal ?? !withIcon;
  const padding = useMinimal || compact ? 'sm' : 'md';
  const inner = (
    <StatCardContent
      title={title}
      value={value}
      icon={icon}
      trend={trend}
      trendTone={trendTone}
      color={color}
      compact={compact}
      minimal={useMinimal}
    />
  );

  if (to) {
    return (
      <Link
        to={to}
        className={cn('block rounded-[var(--radius-card)]', className)}
        aria-label={`${title}: ${value}`}
        title={title}
      >
        <Card padding={padding} rounded="xl" className={cn('flex h-full flex-col', className)}>
          {inner}
        </Card>
      </Link>
    );
  }

  if (useMinimal) {
    return (
      <Card padding="sm" rounded="xl" className={className}>
        {inner}
      </Card>
    );
  }

  return (
    <Card padding={padding} rounded="xl" className={cn('flex h-full flex-col', className)}>
      {inner}
    </Card>
  );
}
