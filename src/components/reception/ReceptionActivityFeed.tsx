import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { LogIn, LogOut } from 'lucide-react';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import { Badge, Spinner } from '../ui';
import { cn } from '../../lib/utils';

export interface TodayAttendanceRow {
  id: number;
  full_name: string;
  cedula: string | null;
  check_in_time: string;
  check_out_time: string | null;
  duration_minutes: number | null;
  is_inside: boolean;
}

interface ReceptionActivityFeedProps {
  limit?: number;
  compact?: boolean;
  className?: string;
  refreshKey?: number;
  /** Search by name or cédula (`?q=`). */
  search?: string;
}

export default function ReceptionActivityFeed({
  limit = 8,
  compact = false,
  className,
  refreshKey = 0,
  search = '',
}: ReceptionActivityFeedProps) {
  const [rows, setRows] = useState<TodayAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (search.trim()) qs.set('q', search.trim());
    const path = qs.size > 0 ? `/api/attendance/today?${qs}` : '/api/attendance/today';
    apiFetch(path)
      .then((res) => parseJsonResponse<TodayAttendanceRow[]>(res))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setRows(limit > 0 ? list.slice(0, limit) : list);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [limit, refreshKey, search]);

  if (loading) {
    return (
      <div className={cn('flex justify-center', compact ? 'py-6' : 'py-8', className)}>
        <Spinner size="xs" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p
        className={cn(
          'text-center text-zinc-400 dark:text-zinc-300',
          compact
            ? 'flex min-h-[120px] flex-1 items-center justify-center py-6 text-xs'
            : 'py-6 text-sm',
          className
        )}
      >
        {search.trim() ? 'Sin resultados para esa búsqueda' : 'Sin movimientos registrados hoy'}
      </p>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {rows.map((row) => (
        <div
          key={row.id}
          className={cn(
            'flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800',
            compact ? 'p-2.5' : 'p-3'
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className={cn(
                'shrink-0 rounded-lg p-1.5',
                row.is_inside
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
              )}
            >
              {row.is_inside ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <p
                className={cn(
                  'truncate font-semibold text-zinc-900 dark:text-white',
                  compact ? 'text-sm' : 'text-base'
                )}
              >
                {row.full_name}
              </p>
              {!compact && row.cedula && (
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{row.cedula}</p>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {format(new Date(row.check_in_time), 'HH:mm', { locale: es })}
            </p>
            {row.is_inside ? (
              <Badge variant="success" className="mt-1 text-[10px]">
                Dentro
              </Badge>
            ) : row.duration_minutes ? (
              <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-300">
                {row.duration_minutes} min
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
