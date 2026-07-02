import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden',
        'after:absolute after:inset-0 after:animate-shimmer after:rounded-xl',
        className
      )}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-14" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export function DashboardSkeleton({ statCount = 4 }: { statCount?: number }) {
  return (
    <div className="page-stack">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className={cn('grid gap-4', statCount === 6 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
        {Array.from({ length: statCount }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <Skeleton className="h-56 sm:h-64 rounded-2xl" />
        <Skeleton className="h-56 sm:h-64 rounded-2xl" />
      </div>
    </div>
  );
}
