import { typography } from '../../lib/typography';
import { cn as cnUtil } from '../../lib/utils';

export const cn = cnUtil;

/**
 * Profile Design System - Exact match with system visual language
 * Derived from: TrainerDashboard, Routines, OperateChrome, DashboardSection
 */

// ─── Surface Tokens ──────────────────────────────────────────────
export const SURFACE = 'border-border/80 bg-surface';
export const SURFACE_RAISED = 'bg-surface-raised border-border/70';
export const DIVIDER = 'border-border/60';
export const DIVIDER_SUBTLE = 'border-border/40';

// ─── Radius ──────────────────────────────────────────────────────
export const RADIUS_CARD = 'rounded-[var(--radius-card)]';
export const RADIUS_XL = 'rounded-xl';

// ─── Spacing ─────────────────────────────────────────────────────
export const SECTION_GAP = 'space-y-2';
export const SECTION_GAP_LG = 'space-y-3';
export const COMPONENT_GAP = 'gap-3';
export const COMPONENT_GAP_LG = 'gap-4';
export const CARD_PADDING = 'p-3 sm:p-4';
export const CARD_PADDING_LG = 'p-4 sm:p-5';

// ─── Typography ──────────────────────────────────────────────────
export const T = {
  pageTitle: typography.pageTitle,
  pageTitleAccent: typography.pageTitleAccent,
  pageSubtitle: typography.pageSubtitle,
  sectionTitle: 'text-sm font-semibold tracking-[-0.01em]',
  statValue: typography.statValueSm,
  statLabel: typography.statLabel,
  body: 'text-text text-sm',
  bodySmall: 'text-text-secondary text-small',
  muted: 'text-text-muted text-sm',
  mutedSmall: 'text-text-muted text-small',
  label: 'text-text text-sm font-medium',
  labelSmall: 'text-text-secondary text-small font-medium',
};

// ─── Interactive States ──────────────────────────────────────────
export const TOUCH_TARGET = 'min-h-[var(--touch-min)]';
export const TAP_FEEDBACK = 'tap-feedback';
export const HOVER_RAISED = 'hover:bg-surface-raised/80';
export const TRANSITION = 'transition-colors';
export const ROW_BASE = `${TAP_FEEDBACK} group border-border/60 ${HOVER_RAISED} flex ${TOUCH_TARGET} items-center gap-3 ${DIVIDER} px-3 py-2.5 ${TRANSITION} last:border-b-0`;

// ─── Card Factory ────────────────────────────────────────────────
export function cardBase(extra = '') {
  return cn('border border-border/80 bg-surface', RADIUS_CARD, extra);
}

export function cardSection(extra = '') {
  return cn('border border-border/80 bg-surface', RADIUS_XL, 'p-3 sm:p-4', extra);
}

export function cardInteractive(extra = '') {
  return cn(
    'border border-border/60 bg-surface',
    RADIUS_XL,
    TAP_FEEDBACK,
    HOVER_RAISED,
    TRANSITION,
    extra
  );
}

// ─── Grid Patterns ───────────────────────────────────────────────
export const GRID_METRIC_STRIP = cn(
  'grid divide-x divide-y divide-[color:var(--color-border)] overflow-hidden',
  RADIUS_CARD,
  'border',
  SURFACE
);

export const GRID_ASYMMETRIC = cn(
  'grid gap-3 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-start md:gap-3'
);

export const GRID_2COL = 'grid grid-cols-2 gap-3 sm:grid-cols-4';
export const GRID_3COL = 'grid grid-cols-1 gap-3 sm:grid-cols-3';

// ─── Section Helpers ─────────────────────────────────────────────
export function sectionHeader(title: string, description?: string, Icon?: React.ElementType) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="text-brand h-5 w-5" />}
        <h2 className={cn(T.sectionTitle, 'text-lg')}>{title}</h2>
      </div>
      {description && <p className={cn(T.muted, 'mt-1')}>{description}</p>}
    </div>
  );
}

export function metricCell({
  to,
  label,
  value,
  loading,
}: {
  to: string;
  label: string;
  value: number | string;
  loading?: boolean;
}) {
  return (
    <a
      href={to}
      className={cn(
        TAP_FEEDBACK,
        'hover:bg-surface-raised/60',
        TOUCH_TARGET,
        'flex-col',
        'items-center',
        'justify-center',
        'gap-0.5',
        'px-1',
        'py-2.5',
        TRANSITION
      )}
    >
      {loading ? (
        <div className="bg-surface-raised h-5 w-8 animate-pulse rounded" />
      ) : (
        <span className={T.statValue}>{value}</span>
      )}
      <span className={T.statLabel}>{label}</span>
    </a>
  );
}

// ─── Row Pattern (OperateRow equivalent) ─────────────────────────
export function operateRow({
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
  icon?: React.ElementType;
  label: string;
  meta?: string;
  count?: number | string;
  tone?: 'neutral' | 'urgent' | 'warn' | 'success';
  onClick?: () => void;
  trailing?: React.ReactNode;
}) {
  const toneClass = tone === 'urgent' ? 'text-danger' : tone === 'warn' ? 'text-warning' : '';

  const inner = (
    <>
      {Icon && <Icon className={cn('h-4 w-4 shrink-0', toneClass)} aria-hidden />}
      <span className="min-w-0 flex-1">
        <span className="text-text block truncate text-sm font-medium tracking-[-0.011em]">
          {label}
        </span>
        {meta && <span className="text-text-muted text-small block truncate">{meta}</span>}
      </span>
      {count != null && <span className={cn(T.statValue, 'text-base', toneClass)}>{count}</span>}
      {trailing}
      <svg className="operate-icon text-text-muted h-4 w-4 shrink-0 opacity-60" aria-hidden>
        <polyline
          points="9 18 15 12 9 6"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );

  const className = ROW_BASE;

  if (to) {
    return (
      <a href={to} className={className}>
        {inner}
      </a>
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

// ─── Badge Tone Mapping ──────────────────────────────────────────
export const BADGE_TONE = {
  neutral: 'default',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  urgent: 'danger',
  accent: 'accent',
} as const;

// ─── Empty State ─────────────────────────────────────────────────
export function emptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-3',
        RADIUS_CARD,
        'border',
        'px-4 py-5',
        'sm:flex-row',
        'sm:items-center',
        'sm:justify-between',
        SURFACE
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon && <Icon className="text-text-muted h-5 w-5 shrink-0" />}
        <div className="min-w-0">
          <p className="text-text text-sm font-medium tracking-[-0.011em]">{title}</p>
          {description && (
            <p className="text-text-secondary text-small mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
