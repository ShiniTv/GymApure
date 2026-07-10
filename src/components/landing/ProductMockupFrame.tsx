import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ProductMockupFrameProps {
  children: ReactNode;
  url: string;
  className?: string;
}

export function ProductMockupFrame({ children, url, className }: ProductMockupFrameProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900',
        className
      )}
    >
      <div className="flex items-center gap-3 border-b border-zinc-200/80 bg-zinc-100/80 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
        </div>
        <p className="mx-auto truncate text-[10px] font-medium text-zinc-500 sm:text-xs dark:text-zinc-400">
          {url}
        </p>
      </div>
      <div className="bg-zinc-50 p-2.5 sm:p-3 md:p-4 dark:bg-zinc-950">{children}</div>
    </div>
  );
}
