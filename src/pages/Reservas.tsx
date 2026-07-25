import { useMemo, useState } from 'react';
import { addDays, format, isSameDay, parseISO, startOfDay } from 'date-fns';
import { dateLocale as es } from '../lib/dateLocale';
import { CalendarDays, Clock, Users } from 'lucide-react';
import {
  Button,
  EmptyState,
  PageHeader,
  Spinner,
  Badge,
  BackToDashboardLink,
  SegmentedControl,
} from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToastOptional } from '../context/ToastContext';
import { apiFetch, parseJsonResponse, parseJsonSafe, connectionOrApiError } from '../lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { typography } from '../lib/typography';
import { cn } from '../lib/utils';

export interface ClassSessionRow {
  id: number;
  class_type_id: number;
  class_type_name: string;
  instructor_id: number | null;
  instructor_name: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  status: 'scheduled' | 'cancelled';
  booked_count: number;
  waitlisted_count: number;
  has_booked: boolean;
  has_waitlisted: boolean;
  my_booking_id: number | null;
}

type FilterTab = 'all' | 'mine';

async function fetchSessions(from: string, to: string): Promise<ClassSessionRow[]> {
  const qs = new URLSearchParams({ from, to });
  const res = await apiFetch(`/api/classes/sessions?${qs}`);
  return parseJsonResponse<ClassSessionRow[]>(res);
}

export default function Reservas() {
  usePageTitle('Reservas');
  const toast = useToastOptional();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');

  const range = useMemo(() => {
    const from = new Date();
    const to = addDays(from, 14);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const {
    data: sessions = [],
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['class-sessions', 'member', range.from, range.to],
    queryFn: () => fetchSessions(range.from, range.to),
  });

  const upcoming = sessions.filter((s) => s.status === 'scheduled');
  const mine = upcoming.filter((s) => s.has_booked || s.has_waitlisted);
  const visible = filter === 'mine' ? mine : upcoming;

  const dayChips = useMemo(() => {
    const days: { key: string; label: string; count: number }[] = [];
    const today = startOfDay(new Date());
    for (let i = 0; i < 7; i++) {
      const d = addDays(today, i);
      const key = format(d, 'yyyy-MM-dd');
      const count = upcoming.filter(
        (s) => format(startOfDay(parseISO(s.starts_at)), 'yyyy-MM-dd') === key
      ).length;
      days.push({
        key,
        label: i === 0 ? 'Hoy' : format(d, 'EEE d', { locale: es }),
        count,
      });
    }
    return days;
  }, [upcoming]);

  const [focusDay, setFocusDay] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, ClassSessionRow[]>();
    for (const session of visible) {
      const dayKey = format(startOfDay(parseISO(session.starts_at)), 'yyyy-MM-dd');
      if (focusDay && dayKey !== focusDay) continue;
      const list = map.get(dayKey) ?? [];
      list.push(session);
      map.set(dayKey, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visible, focusDay]);

  const handleBook = async (sessionId: number) => {
    setBusyId(sessionId);
    try {
      const res = await apiFetch(`/api/classes/sessions/${sessionId}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await parseJsonSafe<{ error?: string }>(res);
        throw new Error(data.error || 'No se pudo reservar');
      }
      const data = await parseJsonSafe<{ waitlisted?: boolean }>(res);
      toast?.success(data.waitlisted ? 'Te agregamos a la lista de espera' : 'Reserva confirmada');
      await queryClient.invalidateQueries({ queryKey: ['class-sessions'] });
    } catch (err) {
      toast?.error(connectionOrApiError(err, 'No se pudo reservar'));
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (bookingId: number) => {
    setBusyId(bookingId);
    try {
      const res = await apiFetch(`/api/classes/bookings/${bookingId}/cancel`, { method: 'POST' });
      if (!res.ok) {
        const data = await parseJsonSafe<{ error?: string }>(res);
        throw new Error(data.error || 'No se pudo cancelar');
      }
      toast?.success('Reserva cancelada');
      await queryClient.invalidateQueries({ queryKey: ['class-sessions'] });
    } catch (err) {
      toast?.error(connectionOrApiError(err, 'No se pudo cancelar'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page-stack-tight mx-auto w-full max-w-5xl">
      <PageHeader
        compact
        title={
          <>
            Mis <span className="text-brand">reservas</span>
          </>
        }
        subtitle="Reserva cupo en clases grupales de los próximos 14 días. Cancela hasta 2 h antes."
        action={<BackToDashboardLink />}
      />

      <SegmentedControl
        ariaLabel="Filtrar reservas"
        value={filter}
        onChange={(v) => setFilter(v)}
        options={[
          { value: 'all', label: `Próximas (${upcoming.length})` },
          { value: 'mine', label: `Mías (${mine.length})` },
        ]}
      />

      {filter === 'all' && !isPending && !isError ? (
        <div
          className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Días de la semana"
        >
          <button
            type="button"
            role="tab"
            aria-selected={focusDay === null}
            onClick={() => setFocusDay(null)}
            className={cn(
              'rounded-pill shrink-0 border px-3 py-1.5 text-xs font-semibold transition-colors',
              focusDay === null
                ? 'border-brand/40 bg-brand/10 text-brand'
                : 'border-border text-text-secondary hover:bg-surface-overlay'
            )}
          >
            Todos
          </button>
          {dayChips.map((day) => (
            <button
              key={day.key}
              type="button"
              role="tab"
              aria-selected={focusDay === day.key}
              onClick={() => setFocusDay(day.key)}
              className={cn(
                'rounded-pill shrink-0 border px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
                focusDay === day.key
                  ? 'border-brand/40 bg-brand/10 text-brand'
                  : 'border-border text-text-secondary hover:bg-surface-overlay'
              )}
            >
              {day.label}
              {day.count > 0 ? (
                <span className="text-text-muted ml-1 tabular-nums">({day.count})</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {isPending ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : isError ? (
        <EmptyState
          icon={CalendarDays}
          title="No se pudieron cargar las clases"
          description="Revisa tu conexión e inténtalo de nuevo."
          action={
            <Button variant="secondary" onClick={() => void refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={filter === 'mine' ? 'Aún no tienes reservas' : 'No hay clases programadas'}
          description={
            filter === 'mine'
              ? 'Elige una clase en Próximas y reserva tu cupo.'
              : 'Cuando el gym publique sesiones, podrás reservar aquí.'
          }
          action={
            filter === 'mine' ? (
              <Button variant="secondary" onClick={() => setFilter('all')}>
                Ver próximas clases
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([dayKey, daySessions]) => {
            const dayDate = parseISO(dayKey);
            const label = isSameDay(dayDate, new Date())
              ? 'Hoy'
              : format(dayDate, "EEEE d 'de' MMMM", { locale: es });
            return (
              <section key={dayKey} className="space-y-3">
                <h2 className={cn(typography.sectionTitle, 'capitalize')}>{label}</h2>
                <ul className="divide-border border-border divide-y border-y">
                  {daySessions.map((session) => {
                    const starts = parseISO(session.starts_at);
                    const ends = parseISO(session.ends_at);
                    const spotsLeft = Math.max(0, session.capacity - session.booked_count);
                    const full = spotsLeft === 0;
                    return (
                      <li
                        key={session.id}
                        className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={cn(typography.cardTitle, 'truncate text-base')}>
                              {session.class_type_name}
                            </h3>
                            {session.has_booked && <Badge variant="success">Reservada</Badge>}
                            {session.has_waitlisted && <Badge variant="warning">En espera</Badge>}
                            {full && !session.has_booked && !session.has_waitlisted && (
                              <Badge variant="warning">Sin cupo</Badge>
                            )}
                          </div>
                          <p className="text-text-secondary flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" aria-hidden />
                              {format(starts, 'HH:mm', { locale: es })} –{' '}
                              {format(ends, 'HH:mm', { locale: es })}
                            </span>
                            {session.instructor_name && <span>{session.instructor_name}</span>}
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" aria-hidden />
                              {session.booked_count}/{session.capacity} cupos
                              {session.waitlisted_count > 0 &&
                                ` · ${session.waitlisted_count} en espera`}
                            </span>
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {(session.has_booked || session.has_waitlisted) &&
                          session.my_booking_id ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={busyId === session.my_booking_id}
                              onClick={() => void handleCancel(session.my_booking_id!)}
                            >
                              Cancelar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              loading={busyId === session.id}
                              onClick={() => void handleBook(session.id)}
                            >
                              {full ? 'Lista de espera' : 'Reservar'}
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
