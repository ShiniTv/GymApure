import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Card } from './Card';
import type { TrendTone } from '../../lib/dashboardTrends';

type StatColor = 'emerald' | 'blue' | 'orange' | 'red';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendTone?: TrendTone;
  color?: StatColor;
  className?: string;
  compact?: boolean;
  /** Sin icono lateral — más limpio para grids densos. */
  minimal?: boolean;
  /** Si se define, la tarjeta completa es un enlace. */
  to?: string;
}

const colorMap: Record<StatColor, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-500 bg-emerald-500/10',
  blue: 'text-blue-600 dark:text-blue-500 bg-blue-500/10',
  orange: 'text-orange-600 dark:text-orange-500 bg-orange-500/10',
  red: 'text-red-600 dark:text-red-500 bg-red-500/10',
};

function StatCardContent({
  title,
  value,
  icon: Icon,
  trend,
  trendTone = 'up',
  color = 'emerald',
  compact,
  minimal,
}: Omit<StatCardProps, 'className' | 'to'>) {
  if (minimal) {
    return (
      <>
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 leading-tight">{title}</p>
        <p className="text-lg sm:text-xl font-bold tabular-nums mt-0.5 text-zinc-900 dark:text-white">{value}</p>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className={cn('stat-label leading-snug mb-1', compact && 'text-[10px] leading-tight')}>{title}</p>
          <p className={cn('stat-value tabular-nums', compact && 'text-lg sm:text-2xl')}>{value}</p>
        </div>
        <div className={cn('shrink-0 rounded-lg', compact ? 'p-2' : 'p-2.5', colorMap[color])}>
          <Icon className={cn(compact ? 'h-4 w-4' : 'h-5 w-5')} />
        </div>
      </div>
      {trend && (
        <div className={cn('flex items-center', compact ? 'mt-1.5' : 'mt-3')}>
          <span
            className={cn(
              'font-medium flex items-center gap-0.5',
              compact ? 'text-[10px] leading-tight' : 'text-xs sm:text-sm',
              trendTone === 'up' && 'text-emerald-600 dark:text-emerald-500',
              trendTone === 'down' && 'text-red-600 dark:text-red-400',
              trendTone === 'neutral' && 'text-zinc-500'
            )}
          >
            {trendTone === 'up' && <TrendingUp className={cn(compact ? 'h-3 w-3' : 'h-4 w-4')} />}
            {trendTone === 'down' && <TrendingDown className={cn(compact ? 'h-3 w-3' : 'h-4 w-4')} />}
            {trendTone === 'neutral' && <Minus className={cn(compact ? 'h-3 w-3' : 'h-4 w-4')} />}
            {trend}
          </span>
        </div>
      )}
    </>
  );
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  trendTone = 'up',
  color = 'emerald',
  className,
  compact,
  minimal,
  to,
}: StatCardProps) {
  const padding = minimal || compact ? 'sm' : 'md';
  const inner = (
    <StatCardContent
      title={title}
      value={value}
      icon={icon}
      trend={trend}
      trendTone={trendTone}
      color={color}
      compact={compact}
      minimal={minimal}
    />
  );

  if (to) {
    return (
      <Link
        to={to}
        className={cn('block rounded-xl transition-colors hover:ring-2 hover:ring-orange-500/25 active:scale-[0.98]', className)}
        aria-label={`${title}: ${value}`}
        title={title}
      >
        <Card padding={padding} rounded="xl" className="h-full">
          {inner}
        </Card>
      </Link>
    );
  }

  if (minimal) {
    return (
      <Card padding="sm" rounded="xl" className={className}>
        {inner}
      </Card>
    );
  }

  return (
    <Card padding={padding} rounded="xl" className={className}>
      {inner}
    </Card>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent',
        className
      )}
    />
  );
}
