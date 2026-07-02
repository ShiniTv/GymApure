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
}

function MotivationalIllustration() {
  return (
    <svg
      viewBox="0 0 120 80"
      className="h-16 w-24 mx-auto mb-3 text-brand/40"
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
}: EmptyStateProps) {
  const isMotivational = variant === 'motivational';

  return (
    <Card
      padding="md"
      rounded="xl"
      className={cn(
        'text-center border-dashed',
        isMotivational && 'bg-gradient-to-b from-brand/5 to-transparent border-brand/20',
        className
      )}
    >
      {isMotivational ? (
        <MotivationalIllustration />
      ) : (
        <Icon className="h-10 w-10 text-zinc-200 dark:text-zinc-700 mx-auto mb-3" />
      )}
      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{title}</p>
      {description && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}
