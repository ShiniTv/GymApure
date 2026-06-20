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
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card
      padding="lg"
      rounded="2xl"
      className={cn('text-center border-dashed', className)}
    >
      <Icon className="h-12 w-12 text-zinc-200 dark:text-zinc-700 mx-auto mb-4" />
      <p className="text-base font-semibold text-zinc-700 dark:text-zinc-200">{title}</p>
      {description && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </Card>
  );
}
