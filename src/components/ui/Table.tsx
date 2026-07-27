import {
  type ReactNode,
  type Key,
  type ThHTMLAttributes,
  type TdHTMLAttributes,
  type HTMLAttributes,
} from 'react';
import { cn } from '../../lib/utils';

export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="border-border/60 bg-surface overflow-x-auto rounded-[var(--radius-card)] border shadow-none">
      <table className={cn('w-full text-left text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('border-border/60 bg-surface-raised/50 border-b', className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('divide-border/50 divide-y', className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('hover:bg-surface-raised/60 transition-colors', className)} {...props}>
      {children}
    </tr>
  );
}

export function TableHeader({
  className,
  children,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'text-text-muted px-4 py-2.5 text-xs font-semibold tracking-wide uppercase',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  className,
  children,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('text-text px-4 py-3', className)} {...props}>
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
        'border-border/60 bg-surface w-full space-y-1.5 rounded-[var(--radius-card)] border p-3 text-left transition-[background-color,border-color,transform] sm:p-4',
        onClick && 'hover:bg-surface-raised/70 cursor-pointer active:scale-[0.99]',
        className
      )}
    >
      {children}
    </Comp>
  );
}
