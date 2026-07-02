import { type ReactNode, type Key, type ThHTMLAttributes, type TdHTMLAttributes, type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className={cn('w-full text-left text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        'bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800',
        className
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-zinc-100 dark:divide-zinc-800', className)} {...props}>{children}</tbody>;
}

export function TableRow({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHeader({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-4 py-2.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ className, children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-3 text-zinc-900 dark:text-zinc-100', className)} {...props}>
      {children}
    </td>
  );
}

/** Mobile-friendly card row alternative to table rows */
export function DataCard({
  className,
  children,
  onClick,
}: {
  key?: Key;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'w-full text-left bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 sm:p-4 space-y-1.5 transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </Comp>
  );
}
