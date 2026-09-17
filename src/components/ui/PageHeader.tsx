import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { typography } from '../../lib/typography';

export type PageHeaderVariant = 'operate' | 'floor' | 'immersive';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  badge?: string;
  className?: string;
  compact?: boolean;
  /** operate = staff desktop; floor = Reception/counter; immersive = workout/kiosk */
  variant?: PageHeaderVariant;
  /** Muestra el título también en móvil (p. ej. saludo personalizado). Por defecto el layout ya muestra la sección. */
  showTitleOnMobile?: boolean;
}

const titleClass: Record<PageHeaderVariant, string> = {
  operate: typography.pageTitle,
  floor: typography.floorTitle,
  immersive: typography.immersiveTitle,
};

export function PageHeader({
  title,
  subtitle,
  action,
  badge,
  className,
  compact,
  variant = 'operate',
  showTitleOnMobile = true,
}: PageHeaderProps) {
  const titleScale = titleClass[variant];

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-2',
        (badge || action) &&
          'max-lg:flex-row max-lg:items-start max-lg:justify-between lg:flex-row lg:items-center lg:justify-between',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className={cn(titleScale, !showTitleOnMobile && 'hidden lg:block')}>{title}</h1>
        {subtitle && <p className={cn(typography.pageSubtitle, compact && 'mt-0.5')}>{subtitle}</p>}
      </div>
      {(badge || action) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 self-center sm:gap-2.5">
          {badge && <p className={cn(typography.small, 'text-text-muted self-center')}>{badge}</p>}
          {action}
        </div>
      )}
    </div>
  );
}
