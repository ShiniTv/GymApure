import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { LogIn, LogOut } from 'lucide-react';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import { Badge, Spinner } from '../ui';
import { cn } from '../../lib/utils';
import { Virtuoso } from 'react-virtuoso';

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
    if (limit > 0) qs.set('limit', String(limit));
    const path = qs.size > 0 ? `/api/attendance/today?${qs}` : '/api/attendance/today';
    apiFetch(path)
      .then((res) => parseJsonResponse<TodayAttendanceRow[]>(res))
      .then((data) => {
        setRows(Array.isArray(data) ? data : []);
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
          'text-text-muted text-center',
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

  const renderRow = (_index: number, row: TodayAttendanceRow) => (
    <div
      className={cn(
        'flex items-center justify-between gap-2.5',
        compact ? 'px-0.5 py-2' : 'border-border/60 border-b px-1 py-2.5 last:border-b-0'
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-md',
            compact ? 'h-7 w-7' : 'p-1.5',
            row.is_inside
              ? 'bg-emerald-500/10 text-emerald-600'
              : 'bg-surface-raised text-text-muted'
          )}
        >
          {row.is_inside ? (
            <LogIn className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          ) : (
            <LogOut className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          )}
        </div>
        <div className="min-w-0">
          <p
            className={cn('text-text truncate font-semibold', compact ? 'text-[13px]' : 'text-sm')}
          >
            {row.full_name}
          </p>
          <p className="text-text-muted truncate text-[11px]">
            {row.cedula ? (
              <>
                {row.cedula}
                <span className="mx-1 opacity-50">·</span>
              </>
            ) : null}
            {format(new Date(row.check_in_time), 'HH:mm', { locale: es })}
            {!row.is_inside && row.duration_minutes != null ? (
              <>
                <span className="mx-1 opacity-50">·</span>
                {row.duration_minutes} min
              </>
            ) : null}
          </p>
        </div>
      </div>
      <div className="shrink-0">
        {row.is_inside ? (
          <Badge variant="success" className="px-1.5 py-0 text-[9px]">
            Dentro
          </Badge>
        ) : null}
      </div>
    </div>
  );

  if (rows.length > 12) {
    return (
      <Virtuoso
        className={className}
        style={{ height: compact ? '18rem' : 'min(50vh, 26rem)' }}
        data={rows}
        itemContent={renderRow}
      />
    );
  }

  return (
    <div className={cn('divide-border/60 divide-y', className)}>
      {rows.map((row, index) => (
        <div key={row.id}>{renderRow(index, row)}</div>
      ))}
    </div>
  );
}
