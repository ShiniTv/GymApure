import { type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { typography } from '../../lib/typography';
import { Skeleton } from '../ui/Skeleton';
import { routePrefetchHandlers } from '../../lib/routePrefetch';
import { OperateIcon, type OperateIconTone } from './OperateIcon';

const SURFACE = 'border-border/80 bg-surface';

/** Page stack used by trainer Operate surfaces. */
export function OperatePage({
  children,
  className,
  maxWidth = 'max-w-7xl',
}: {
  children: ReactNode;
  className?: string;
  maxWidth?: string;
}) {
  return (
    <div className={cn('page-stack-tight stagger-fade-in mx-auto w-full', maxWidth, className)}>
      {children}
    </div>
  );
}

export function OperateHeader({
  title,
  subtitle,
  action,
  icon,
  iconTone = 'brand',
  leading,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
  iconTone?: OperateIconTone;
  /** Custom leading (e.g. Avatar) — replaces icon when set */
  leading?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-3',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        {leading ? (
          <div className="shrink-0">{leading}</div>
        ) : icon ? (
          <OperateIcon icon={icon} tone={iconTone} well size="lg" />
        ) : null}
        <div className="min-w-0">
          <h1 className={typography.pageTitle}>{title}</h1>
          {subtitle ? (
            typeof subtitle === 'string' ? (
              <p className={typography.pageSubtitle}>{subtitle}</p>
            ) : (
              <div className={typography.pageSubtitle}>{subtitle}</div>
            )
          ) : null}
        </div>
      </div>
      {action ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{action}</div>
      ) : null}
    </header>
  );
}

export function OperateSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-2', className)}>
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 className="text-text text-sm font-semibold tracking-[-0.01em]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export type OperateTone = 'neutral' | 'urgent' | 'warn' | 'success';

function toneToIcon(tone: OperateTone): OperateIconTone {
  if (tone === 'urgent') return 'danger';
  if (tone === 'warn') return 'warn';
  if (tone === 'success') return 'success';
  return 'neutral';
}

export function OperateRow({
  to,
  icon: Icon,
  label,
  meta,
  count,
  tone = 'neutral',
  onClick,
  trailing,
}: {
  to?: string;
  icon?: LucideIcon;
  label: string;
  meta?: string;
  count?: number | string;
  tone?: OperateTone;
  onClick?: () => void;
  trailing?: ReactNode;
}) {
  const toneCount =
    tone === 'urgent' ? 'text-danger' : tone === 'warn' ? 'text-warning' : undefined;

  const inner = (
    <>
      {Icon ? <OperateIcon icon={Icon} tone={toneToIcon(tone)} size="sm" /> : null}
      <span className="min-w-0 flex-1">
        <span className="text-text block truncate text-sm font-medium tracking-[-0.011em]">
          {label}
        </span>
        {meta ? <span className="text-text-muted text-small block truncate">{meta}</span> : null}
      </span>
      {count != null ? (
        <span className={cn(typography.statValueSm, 'text-base', toneCount)}>{count}</span>
      ) : null}
      {trailing}
      <ChevronRight
        className="operate-icon text-text-muted h-4 w-4 shrink-0 opacity-60"
        aria-hidden
      />
    </>
  );

  const className =
    'tap-feedback group border-border/60 hover:bg-surface-raised/80 flex min-h-[var(--touch-min)] items-center gap-3 border-b px-3 py-2.5 transition-colors last:border-b-0';

  if (to) {
    return (
      <Link to={to} {...routePrefetchHandlers(to)} className={className}>
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(className, 'w-full text-left')}>
        {inner}
      </button>
    );
  }

  return <div className={className}>{inner}</div>;
}

export function OperateList({
  children,
  className,
  loading,
  rows = 3,
}: {
  children?: ReactNode;
  className?: string;
  loading?: boolean;
  rows?: number;
}) {
  if (loading) {
    return (
      <div
        className={cn('overflow-hidden rounded-[var(--radius-card)] border', SURFACE, className)}
      >
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-none" />
        ))}
      </div>
    );
  }
  return (
    <div className={cn('overflow-hidden rounded-[var(--radius-card)] border', SURFACE, className)}>
      {children}
    </div>
  );
}

export function OperateMetricStrip({
  items,
  loading,
}: {
  items: {
    to?: string;
    label: string;
    value: number | string;
    icon?: LucideIcon;
    onClick?: () => void;
  }[];
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        'grid divide-x divide-[color:var(--color-border)] overflow-hidden rounded-[var(--radius-card)] border',
        SURFACE
      )}
      style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const body = (
          <>
            {item.icon ? (
              <OperateIcon icon={item.icon} tone="brand" size="sm" className="mb-0.5" />
            ) : null}
            {loading ? (
              <Skeleton className="h-5 w-8" />
            ) : (
              <span className={typography.statValueSm}>{item.value}</span>
            )}
            <span className={typography.statLabel}>{item.label}</span>
          </>
        );
        const cellClass =
          'tap-feedback group hover:bg-surface-raised/60 flex min-h-[var(--touch-min)] flex-col items-center justify-center gap-0.5 px-1.5 py-2 transition-colors sm:min-h-[3.25rem]';

        if (item.to) {
          return (
            <Link
              key={item.label}
              to={item.to}
              {...routePrefetchHandlers(item.to)}
              className={cellClass}
              aria-label={`${item.label}: ${item.value}`}
            >
              {body}
            </Link>
          );
        }
        if (item.onClick) {
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={cn(cellClass, 'w-full')}
              aria-label={`${item.label}: ${item.value}`}
            >
              {body}
            </button>
          );
        }
        return (
          <div key={item.label} className={cellClass} aria-label={`${item.label}: ${item.value}`}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

export function OperateEmpty({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-3 rounded-[var(--radius-card)] border px-4 py-5 sm:flex-row sm:items-center sm:justify-between',
        SURFACE
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <OperateIcon icon={icon} tone="neutral" well size="md" /> : null}
        <div className="min-w-0">
          <p className="text-text text-sm font-medium tracking-[-0.011em]">{title}</p>
          {description ? (
            <p className="text-text-secondary text-small mt-0.5 leading-relaxed">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function OperateCallout({
  children,
  tone = 'warn',
  icon,
  onClick,
}: {
  children: ReactNode;
  tone?: OperateIconTone;
  icon: LucideIcon;
  onClick?: () => void;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'group border-border/80 bg-surface flex w-full items-center gap-3 rounded-[var(--radius-card)] border px-3 py-3 text-left',
        onClick && 'tap-feedback hover:bg-surface-raised/80 transition-colors'
      )}
    >
      <OperateIcon icon={icon} tone={tone} well size="md" />
      <div className="text-text-secondary text-small min-w-0 flex-1 leading-snug">{children}</div>
      {onClick ? (
        <ChevronRight className="operate-icon text-text-muted h-4 w-4 shrink-0 opacity-60" />
      ) : null}
    </Comp>
  );
}

export { SURFACE as OPERATE_SURFACE };
export { OperateIcon } from './OperateIcon';
