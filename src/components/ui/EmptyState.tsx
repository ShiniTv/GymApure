import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';
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
}: EmptyStateProps) {
  const isMotivational = variant === 'motivational';

  return (
    <Card
      padding={compact ? 'sm' : 'md'}
      rounded="xl"
      className={cn(
        'border-dashed text-center',
        isMotivational && 'from-brand/5 border-brand/20 bg-gradient-to-b to-transparent',
        compact && 'border-zinc-200/70 py-6 dark:border-zinc-800/70',
        className
      )}
    >
      {isMotivational ? (
        <MotivationalIllustration />
      ) : (
        <Icon
          className={cn(
            'mx-auto text-zinc-300 dark:text-zinc-600',
            compact ? 'mb-2.5 h-8 w-8' : 'mb-4 h-12 w-12'
          )}
        />
      )}
      <p
        className={cn(
          'font-semibold text-zinc-700 dark:text-zinc-200',
          compact ? 'text-[13px]' : 'text-sm'
        )}
      >
        {title}
      </p>
      {description && (
        <p
          className={cn(
            'mx-auto text-zinc-500 dark:text-zinc-400',
            compact ? 'mt-1 max-w-xs text-[11px] leading-snug' : 'mt-1.5 max-w-sm text-xs'
          )}
        >
          {description}
        </p>
      )}
      {action && (
        <div className={cn('flex justify-center', compact ? 'mt-3' : 'mt-4')}>{action}</div>
      )}
    </Card>
  );
}
