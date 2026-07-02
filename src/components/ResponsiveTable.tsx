import { type ReactNode, Fragment } from 'react';
import { cn } from '../lib/utils';

interface ResponsiveTableProps<T> {
  items: T[];
  keyExtractor: (item: T) => string | number;
  mobile: (item: T, index: number) => ReactNode;
  desktop: (item: T, index: number) => ReactNode;
  header?: ReactNode;
  loading?: boolean;
  loadingSkeleton?: ReactNode;
  emptyState?: ReactNode;
  mobileClassName?: string;
  desktopClassName?: string;
}

export function ResponsiveTable<T>({
  items,
  keyExtractor,
  mobile,
  desktop,
  header,
  loading,
  loadingSkeleton,
  emptyState,
  mobileClassName,
  desktopClassName,
}: ResponsiveTableProps<T>) {
  if (loading && loadingSkeleton) {
    return <>{loadingSkeleton}</>;
  }

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <>
      <div className={cn('md:hidden divide-y divide-zinc-100 dark:divide-zinc-800', mobileClassName)}>
        {items.map((item, index) => (
          <div key={keyExtractor(item)}>{mobile(item, index)}</div>
        ))}
      </div>

      <div className={cn('hidden md:block overflow-x-auto', desktopClassName)}>
        <table className="w-full text-left text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          {header && (
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {header}
            </thead>
          )}
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((item, index) => (
              <Fragment key={keyExtractor(item)}>{desktop(item, index)}</Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
