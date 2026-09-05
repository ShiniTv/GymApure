import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { typography } from '../../lib/typography';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  badge?: string;
  className?: string;
  compact?: boolean;
  /** Muestra el título también en móvil (p. ej. saludo personalizado). Por defecto el layout ya muestra la sección. */
  showTitleOnMobile?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  action,
  badge,
  className,
  compact,
  showTitleOnMobile = false,
}: PageHeaderProps) {
  const hideTitleOnMobile = !showTitleOnMobile;

  return (
    <div
      className={cn(
        'flex flex-col gap-2.5 sm:gap-3',
        (badge || action) &&
          'max-lg:flex-row max-lg:items-start max-lg:justify-between lg:flex-row lg:items-center lg:justify-between',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <h1
          className={cn(
            typography.pageTitle,
            compact && 'text-lg sm:text-xl lg:text-2xl',
            hideTitleOnMobile && 'hidden lg:block'
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={cn(
              typography.pageSubtitle,
              compact && 'text-small',
              hideTitleOnMobile &&
                'max-lg:text-text-secondary max-lg:text-sm max-lg:leading-snug max-lg:font-medium'
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      {(badge || action) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 self-center sm:gap-3">
          {badge && <p className={cn(typography.small, 'text-text-muted self-center')}>{badge}</p>}
          {action}
        </div>
      )}
    </div>
  );
}
