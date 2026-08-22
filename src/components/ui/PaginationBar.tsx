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

export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  label = 'registros',
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (total === 0) return null;

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="border-border/70 flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-6">
      <p className="text-text-muted min-w-0 truncate text-xs font-medium">
        {total} {label} · Página {page} de {totalPages}
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors',
            'text-text-secondary hover:bg-surface-overlay',
            'disabled:pointer-events-none disabled:opacity-30'
          )}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageNumbers.map((p, i) =>
          p === 'ellipsis' ? (
            <span
              key={`ellipsis-${i}`}
              className="text-text-muted flex h-9 w-9 items-center justify-center text-xs select-none"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                'flex h-9 min-w-9 items-center justify-center rounded-lg px-1.5 text-sm font-semibold transition-colors',
                p === page
                  ? 'brand-solid shadow-sm'
                  : 'text-text-secondary hover:bg-surface-overlay'
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
            'flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors',
            'text-text-secondary hover:bg-surface-overlay',
            'disabled:pointer-events-none disabled:opacity-30'
          )}
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
