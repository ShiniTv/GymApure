import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { typography } from '../../lib/typography';
import { Card } from './Card';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  variant?: 'default' | 'motivational';
  /** Smaller icon and tighter padding for list pages */
  compact?: boolean;
  /**
   * When false, render without the dashed Card chrome (avoids box-in-box
   * when already inside a Card or list panel). Default true.
   */
  framed?: boolean;
}

function MotivationalIllustration() {
  return (
    <svg
      viewBox="0 0 120 80"
      className="text-brand/40 mx-auto mb-3 h-16 w-24"
      aria-hidden
      fill="none"
    >
      <circle cx="60" cy="40" r="28" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
      <path
        d="M48 42 L56 50 L72 32"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="20" r="4" fill="currentColor" opacity="0.5" />
      <circle cx="96" cy="58" r="3" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = 'default',
  compact = false,
  framed = true,
}: EmptyStateProps) {
  const isMotivational = variant === 'motivational';

  const body = (
    <>
      {isMotivational ? (
        <MotivationalIllustration />
      ) : (
        <Icon
          className={cn('text-text-muted mx-auto', compact ? 'mb-2.5 h-7 w-7' : 'mb-3.5 h-9 w-9')}
        />
      )}
      <h3 className={cn(typography.sectionTitle, 'text-text', compact ? 'text-small' : 'text-sm')}>
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            typography.small,
            'text-text-secondary mx-auto',
            compact ? 'mt-1 max-w-xs' : 'mt-1.5 max-w-sm'
          )}
        >
          {description}
        </p>
      )}
      {action && (
        <div className={cn('flex justify-center', compact ? 'mt-3' : 'mt-4')}>{action}</div>
      )}
    </>
  );

  if (!framed) {
    return <div className={cn('text-center', compact ? 'py-4' : 'py-6', className)}>{body}</div>;
  }

  return (
    <Card
      padding={compact ? 'sm' : 'md'}
      rounded="xl"
      variant="dashed"
      className={cn(
        'text-center',
        isMotivational && 'border-border/70 bg-surface',
        compact && 'border-border/60 py-6',
        className
      )}
    >
      {body}
    </Card>
  );
}
