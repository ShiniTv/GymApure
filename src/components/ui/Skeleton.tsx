import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative animate-pulse overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800',
        'after:animate-shimmer after:absolute after:inset-0 after:rounded-xl',
        className
      )}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
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
      <div
        className={cn(
          'grid gap-4',
          statCount === 6
            ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        )}
      >
        {Array.from({ length: statCount }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-2xl sm:h-64" />
        <Skeleton className="h-56 rounded-2xl sm:h-64" />
      </div>
    </div>
  );
}
