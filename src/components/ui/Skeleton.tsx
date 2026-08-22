import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-surface-overlay/70 relative animate-pulse overflow-hidden rounded-xl',
        'after:animate-shimmer after:absolute after:inset-0 after:rounded-xl',
        className
      )}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="border-border/80 bg-surface rounded-xl border p-4 shadow-xs sm:p-5">
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
    <tr className="border-border/60 border-b">
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

/** Filter chip row placeholder */
export function FilterChipsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-20 rounded-[var(--radius-button)]" />
      ))}
    </div>
  );
}

/** Audit log page — timeline on mobile, table on desktop */
export function AuditLogsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando auditoría">
      <div className="space-y-4 lg:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-28 rounded-[var(--radius-chip)]" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="table-shell hidden overflow-hidden lg:block">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="border-border bg-surface-raised text-text-muted border-b text-[11px] font-semibold tracking-wide uppercase">
            <tr>
              {['Cuándo', 'Acción', 'Actor', 'Detalle'].map((col) => (
                <th key={col} className="px-3 py-2.5">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border-subtle divide-y">
            <TableRowSkeleton cols={4} />
            <TableRowSkeleton cols={4} />
            <TableRowSkeleton cols={4} />
            <TableRowSkeleton cols={4} />
            <TableRowSkeleton cols={4} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Routine calendar — month header, palette chips, grid */
export function CalendarViewSkeleton() {
  return (
    <div className="space-y-2.5" aria-busy="true" aria-label="Cargando calendario">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-9 w-9 rounded-[var(--radius-button)]" />
          <Skeleton className="h-9 w-9 rounded-[var(--radius-button)]" />
          <Skeleton className="h-9 w-9 rounded-[var(--radius-button)]" />
        </div>
      </div>
      <div className="border-border hidden space-y-2 rounded-xl border p-2.5 lg:block">
        <Skeleton className="h-3 w-40" />
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-28 rounded-[var(--radius-button)]" />
          ))}
        </div>
      </div>
      <div className="border-border hidden overflow-hidden rounded-xl border xl:block">
        <div className="border-border-subtle bg-surface-raised grid grid-cols-7 gap-px border-b p-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="mx-auto h-3 w-8" />
          ))}
        </div>
        <div className="bg-border-subtle grid grid-cols-7 gap-px p-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="bg-surface h-16 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Routine assignments member cards */
export function AssignmentsListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" aria-busy="true" aria-label="Cargando asignaciones">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-border rounded-xl border p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Skeleton className="h-6 w-24 rounded-[var(--radius-button)]" />
            <Skeleton className="h-6 w-20 rounded-[var(--radius-button)]" />
          </div>
        </div>
      ))}
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
