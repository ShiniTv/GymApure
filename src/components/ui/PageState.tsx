import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PageStateProps {
  children: ReactNode;
  className?: string;
}

/** Centered loading / empty shell — consistent height across pages */
export function PageState({ children, className }: PageStateProps) {
  return (
    <div className={cn('page-state-center flex-col', className)}>
      {children}
    </div>
  );
}
