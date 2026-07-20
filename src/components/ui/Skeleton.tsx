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

/** Conversation list / payment card placeholders */
export function ListRowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-2" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl px-2.5 py-2.5">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Chat bubble placeholders while messages load */
export function ChatBubbleSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-1 flex-col gap-3 px-3 py-4" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
          <Skeleton
            className={cn(
              'h-10 rounded-2xl',
              i % 3 === 0 ? 'w-3/5' : i % 2 === 0 ? 'w-2/5' : 'w-1/2'
            )}
          />
        </div>
      ))}
    </div>
  );
}

/** Active workout shell while routine/session hydrates */
export function WorkoutShellSkeleton() {
  return (
    <div className="page-stack" aria-busy="true" aria-label="Cargando entrenamiento">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
