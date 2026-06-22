import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  label?: string;
}

export function PaginationBar({ page, pageSize, total, onPageChange, label = 'registros' }: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-zinc-100 dark:border-zinc-800">
      <p className="text-xs font-medium text-zinc-400 min-w-0 truncate">
        {total} {label} · Página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 rounded-xl"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 rounded-xl"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
