import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  label?: string;
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [];
  pages.push(1);

  if (current > 3) {
    pages.push('ellipsis');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('ellipsis');
  }

  pages.push(total);

  return pages;
}

export function PaginationBar({ page, pageSize, total, onPageChange, label = 'registros' }: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (total === 0) return null;

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-zinc-100 dark:border-zinc-800">
      <p className="text-xs font-medium text-zinc-400 dark:text-zinc-300 min-w-0 truncate">
        {total} {label} · Página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={cn(
            'h-9 w-9 flex items-center justify-center rounded-xl text-sm font-semibold transition-colors',
            'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800',
            'disabled:opacity-30 disabled:pointer-events-none'
          )}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageNumbers.map((p, i) =>
          p === 'ellipsis' ? (
            <span
              key={`ellipsis-${i}`}
              className="h-9 w-9 flex items-center justify-center text-xs text-zinc-400 dark:text-zinc-500 select-none"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                'h-9 min-w-9 px-1.5 flex items-center justify-center rounded-xl text-sm font-semibold transition-colors',
                p === page
                  ? 'bg-brand text-white dark:text-zinc-900 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              )}
              aria-label={`Página ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className={cn(
            'h-9 w-9 flex items-center justify-center rounded-xl text-sm font-semibold transition-colors',
            'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800',
            'disabled:opacity-30 disabled:pointer-events-none'
          )}
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
