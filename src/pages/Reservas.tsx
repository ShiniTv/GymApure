import { useMemo, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { dateLocale as es } from '../lib/dateLocale';
import { CalendarDays, Clock } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  Badge,
  BackToDashboardLink,
} from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToastOptional } from '../context/ToastContext';
import { apiFetch, parseJsonResponse, parseJsonSafe, connectionOrApiError } from '../lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
    <div className="page-stack">
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

      {isPending ? (
        <div className="flex justify-center py-16">
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
      ) : upcoming.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No hay clases programadas"
          description="Cuando el gym publique sesiones, podrás reservar aquí."
        />
      ) : (
        <div className="space-y-3">
          {upcoming.map((session) => {
            const starts = parseISO(session.starts_at);
            const ends = parseISO(session.ends_at);
            const spotsLeft = Math.max(0, session.capacity - session.booked_count);
            const full = spotsLeft === 0;
            return (
              <Card key={session.id} padding="md" rounded="xl">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-bold text-zinc-900 dark:text-white">
                        {session.class_type_name}
                      </h3>
                      {session.has_booked && <Badge variant="success">Reservada</Badge>}
                      {session.has_waitlisted && <Badge variant="warning">En espera</Badge>}
                      {full && !session.has_booked && !session.has_waitlisted && (
                        <Badge variant="warning">Sin cupo</Badge>
                      )}
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {format(starts, 'EEE d MMM · HH:mm', { locale: es })}
                        {' – '}
                        {format(ends, 'HH:mm', { locale: es })}
                      </span>
                      {session.instructor_name && <span>· {session.instructor_name}</span>}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {session.booked_count}/{session.capacity} cupos
                      </span>
                      {session.waitlisted_count > 0 && (
                        <span>· {session.waitlisted_count} en espera</span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {(session.has_booked || session.has_waitlisted) && session.my_booking_id ? (
                      <Button
                        variant="ghost"
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
                        {full ? 'Unirme a lista' : 'Reservar'}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
