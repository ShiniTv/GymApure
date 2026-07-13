import { type ReactNode, Fragment, type ReactElement } from 'react';
import { cn } from '../lib/utils';
import { Card } from './ui/Card';

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
  /** Wrap the mobile list (e.g. StaggerContainer) */
  mobileWrapper?: (children: ReactElement[]) => ReactNode;
  desktopClassName?: string;
  /** Breakpoint for table vs cards — default lg to match Members/Payments */
  breakpoint?: 'md' | 'lg';
  /** Wrap desktop table in Card (padding none, rounded xl) */
  desktopInCard?: boolean;
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
  mobileWrapper,
  desktopClassName,
  breakpoint = 'lg',
  desktopInCard = false,
}: ResponsiveTableProps<T>) {
  const mobileHidden = breakpoint === 'lg' ? 'lg:hidden' : 'md:hidden';
  const desktopHidden = breakpoint === 'lg' ? 'hidden lg:block' : 'hidden md:block';

  if (loading && loadingSkeleton) {
    return <>{loadingSkeleton}</>;
  }

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const table = (
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
  );

  const desktopContent = <div className={cn('overflow-x-auto', desktopClassName)}>{table}</div>;

  const mobileItems = items.map((item, index) => (
    <div key={keyExtractor(item)}>{mobile(item, index)}</div>
  ));

  return (
    <>
      <div className={cn(mobileHidden, mobileClassName)}>
        {mobileWrapper ? mobileWrapper(mobileItems) : mobileItems}
      </div>

      {desktopInCard ? (
        <Card
          padding="none"
          rounded="xl"
          className={cn('table-shell overflow-hidden', desktopHidden)}
        >
          {desktopContent}
        </Card>
      ) : (
        <div className={cn(desktopHidden, desktopClassName)}>
          <div className="overflow-x-auto">{table}</div>
        </div>
      )}
    </>
  );
}
