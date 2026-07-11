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
  /** Breakpoint for table vs cards — default lg to match Members/Payments */
  breakpoint?: 'md' | 'lg';
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
  breakpoint = 'lg',
}: ResponsiveTableProps<T>) {
  const mobileHidden = breakpoint === 'lg' ? 'lg:hidden' : 'md:hidden';
  const desktopHidden = breakpoint === 'lg' ? 'hidden lg:block' : 'hidden md:block';

  if (loading && loadingSkeleton) {
    return <>{loadingSkeleton}</>;
  }

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <>
      <div
        className={cn(
          mobileHidden,
          'divide-y divide-zinc-100 dark:divide-zinc-800',
          mobileClassName
        )}
      >
        {items.map((item, index) => (
          <div key={keyExtractor(item)}>{mobile(item, index)}</div>
        ))}
      </div>

      <div className={cn(desktopHidden, 'overflow-x-auto', desktopClassName)}>
        <table className="w-full text-left text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
          {header && (
            <thead className="bg-zinc-50 text-[10px] font-semibold text-zinc-500 sm:text-xs dark:bg-zinc-800/50 dark:text-zinc-400">
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
