import { type ReactNode, Fragment, type ReactElement } from 'react';
import { Virtuoso } from 'react-virtuoso';
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
  /** Virtualize long mobile card lists at or above this item count. */
  virtualizeMobileAt?: number;
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
  virtualizeMobileAt,
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
    <table className="text-text-muted w-full text-left text-xs sm:text-sm">
      {header && (
        <thead className="bg-surface-raised text-text-muted text-small font-semibold sm:text-xs">
          {header}
        </thead>
      )}
      <tbody className="divide-border-subtle divide-y">
        {items.map((item, index) => (
          <Fragment key={keyExtractor(item)}>{desktop(item, index)}</Fragment>
        ))}
      </tbody>
    </table>
  );

  const desktopContent = (
    <div className={cn('w-full min-w-0 overflow-x-auto', desktopClassName)}>{table}</div>
  );

  const mobileItems = items.map((item, index) => (
    <div key={keyExtractor(item)} className="min-w-0">
      {mobile(item, index)}
    </div>
  ));

  return (
    <>
      <div className={cn('w-full min-w-0', mobileHidden, mobileClassName)}>
        {virtualizeMobileAt && items.length >= virtualizeMobileAt ? (
          <Virtuoso
            style={{ height: 'min(70vh, 48rem)' }}
            data={items}
            itemContent={(index, item) => (
              <div className="min-w-0 pb-2.5">{mobile(item, index)}</div>
            )}
          />
        ) : mobileWrapper ? (
          mobileWrapper(mobileItems)
        ) : (
          mobileItems
        )}
      </div>

      {desktopInCard ? (
        <Card
          padding="none"
          rounded="xl"
          className={cn('table-shell w-full min-w-0 overflow-hidden', desktopHidden)}
        >
          {desktopContent}
        </Card>
      ) : (
        <div className={cn('w-full min-w-0', desktopHidden, desktopClassName)}>
          <div className="w-full min-w-0 overflow-x-auto">{table}</div>
        </div>
      )}
    </>
  );
}
