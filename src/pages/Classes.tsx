import { useMemo, useState, type FormEvent } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { dateLocale as es } from '../lib/dateLocale';
import { CalendarDays, Plus } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  Badge,
  BackToDashboardLink,
  Modal,
  Label,
  Input,
  Select,
} from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../context/AuthContext';
import { useToastOptional } from '../context/ToastContext';
import { apiFetch, parseJsonResponse, parseJsonSafe, connectionOrApiError } from '../lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ClassSessionRow } from './Reservas';

interface ClassType {
  id: number;
  name: string;
  duration_minutes: number;
  default_capacity: number;
  is_active: boolean;
}

async function fetchTypes(): Promise<ClassType[]> {
  const res = await apiFetch('/api/classes/types');
  return parseJsonResponse<ClassType[]>(res);
}

async function fetchSessions(from: string, to: string): Promise<ClassSessionRow[]> {
  const qs = new URLSearchParams({ from, to });
  const res = await apiFetch(`/api/classes/sessions?${qs}`);
  return parseJsonResponse<ClassSessionRow[]>(res);
}

export default function Classes() {
  usePageTitle('Clases');
  const { user } = useAuth();
  const toast = useToastOptional();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';
  const canCreateSession = user?.role === 'admin' || user?.role === 'trainer';

  const [typeModal, setTypeModal] = useState(false);
  const [sessionModal, setSessionModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [typeForm, setTypeForm] = useState({
    name: '',
    duration_minutes: '60',
    default_capacity: '15',
  });
  const [sessionForm, setSessionForm] = useState({
    class_type_id: '',
    starts_at: '',
    capacity: '',
  });

  const range = useMemo(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = addDays(from, 21);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const { data: types = [], isPending: typesLoading } = useQuery({
    queryKey: ['class-types'],
    queryFn: fetchTypes,
    enabled: canCreateSession || user?.role === 'receptionist',
  });

  const {
    data: sessions = [],
    isPending: sessionsLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['class-sessions', 'staff', range.from, range.to],
    queryFn: () => fetchSessions(range.from, range.to),
  });

  const activeTypes = types.filter((t) => t.is_active);

  const handleCreateType = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await apiFetch('/api/classes/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: typeForm.name.trim(),
          duration_minutes: Number(typeForm.duration_minutes),
          default_capacity: Number(typeForm.default_capacity),
        }),
      });
      if (!res.ok) {
        const data = await parseJsonSafe<{ error?: string }>(res);
        throw new Error(data.error || 'No se pudo crear el tipo');
      }
      setTypeModal(false);
      setTypeForm({ name: '', duration_minutes: '60', default_capacity: '15' });
      toast?.success('Tipo de clase creado');
      await queryClient.invalidateQueries({ queryKey: ['class-types'] });
    } catch (err) {
      setError(connectionOrApiError(err, 'No se pudo crear el tipo'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSession = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        class_type_id: Number(sessionForm.class_type_id),
        starts_at: new Date(sessionForm.starts_at).toISOString(),
      };
      if (sessionForm.capacity) body.capacity = Number(sessionForm.capacity);
      const res = await apiFetch('/api/classes/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await parseJsonSafe<{ error?: string }>(res);
        throw new Error(data.error || 'No se pudo programar la clase');
      }
      setSessionModal(false);
      setSessionForm({ class_type_id: '', starts_at: '', capacity: '' });
      toast?.success('Clase programada');
      await queryClient.invalidateQueries({ queryKey: ['class-sessions'] });
    } catch (err) {
      setError(connectionOrApiError(err, 'No se pudo programar'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSession = async (sessionId: number) => {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/classes/sessions/${sessionId}/cancel`, { method: 'POST' });
      if (!res.ok) {
        const data = await parseJsonSafe<{ error?: string }>(res);
        throw new Error(data.error || 'No se pudo cancelar');
      }
      toast?.success('Clase cancelada');
      await queryClient.invalidateQueries({ queryKey: ['class-sessions'] });
    } catch (err) {
      toast?.error(connectionOrApiError(err, 'No se pudo cancelar'));
    } finally {
      setSaving(false);
    }
  };

  const loading = sessionsLoading || (canCreateSession && typesLoading);

  return (
    <div className="page-stack">
      <PageHeader
        compact
        title={
          <>
            Clases <span className="text-brand">grupales</span>
          </>
        }
        subtitle="Programa sesiones, controla cupos y cancela si hace falta."
        action={
          <div className="flex shrink-0 items-center gap-2">
            <BackToDashboardLink />
            {isAdmin && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setError('');
                  setTypeModal(true);
                }}
              >
                Nuevo tipo
              </Button>
            )}
            {canCreateSession && (
              <Button
                size="sm"
                className="h-11 min-h-11 w-11 shrink-0 rounded-xl p-0 sm:w-auto sm:px-4"
                onClick={() => {
                  setError('');
                  setSessionModal(true);
                }}
                aria-label="Programar clase"
              >
                <Plus className="h-5 w-5" />
                <span className="hidden sm:inline">Programar</span>
              </Button>
            )}
          </div>
        }
      />

      {loading ? (
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
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Sin clases programadas"
          description={
            canCreateSession
              ? 'Crea un tipo de clase (admin) y programa la primera sesión.'
              : 'Aún no hay sesiones en los próximos días.'
          }
          action={
            canCreateSession ? (
              <Button
                onClick={() => {
                  setError('');
                  setSessionModal(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Programar clase
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const starts = parseISO(session.starts_at);
            const cancelled = session.status === 'cancelled';
            return (
              <Card key={session.id} padding="md" rounded="xl">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                        {session.class_type_name}
                      </h3>
                      {cancelled ? (
                        <Badge variant="danger">Cancelada</Badge>
                      ) : (
                        <Badge variant="default">
                          {session.booked_count}/{session.capacity} cupos
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {format(starts, 'EEE d MMM yyyy · HH:mm', { locale: es })}
                      {session.instructor_name ? ` · ${session.instructor_name}` : ''}
                    </p>
                  </div>
                  {!cancelled && (
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={saving}
                      onClick={() => void handleCancelSession(session.id)}
                    >
                      Cancelar clase
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={typeModal}
        onClose={() => {
          if (!saving) setTypeModal(false);
        }}
        title={
          <>
            Nuevo <span className="text-brand">tipo</span>
          </>
        }
      >
        <form onSubmit={handleCreateType} className="space-y-4">
          <div>
            <Label>Nombre</Label>
            <Input
              required
              value={typeForm.name}
              onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              placeholder="Ej: Spinning"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duración (min)</Label>
              <Input
                type="number"
                required
                min={1}
                value={typeForm.duration_minutes}
                onChange={(e) => setTypeForm({ ...typeForm, duration_minutes: e.target.value })}
              />
            </div>
            <div>
              <Label>Cupo default</Label>
              <Input
                type="number"
                required
                min={1}
                value={typeForm.default_capacity}
                onChange={(e) => setTypeForm({ ...typeForm, default_capacity: e.target.value })}
              />
            </div>
          </div>
          {error && (
            <p className="text-center text-xs text-red-500" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" loading={saving}>
            Crear tipo
          </Button>
        </form>
      </Modal>

      <Modal
        open={sessionModal}
        onClose={() => {
          if (!saving) setSessionModal(false);
        }}
        title={
          <>
            Programar <span className="text-brand">clase</span>
          </>
        }
      >
        <form onSubmit={handleCreateSession} className="space-y-4">
          <div>
            <Label>Tipo</Label>
            <Select
              required
              value={sessionForm.class_type_id}
              onChange={(e) => setSessionForm({ ...sessionForm, class_type_id: e.target.value })}
            >
              <option value="">Seleccionar…</option>
              {activeTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.duration_minutes} min · cupo {t.default_capacity})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Inicio</Label>
            <Input
              type="datetime-local"
              required
              value={sessionForm.starts_at}
              onChange={(e) => setSessionForm({ ...sessionForm, starts_at: e.target.value })}
            />
          </div>
          <div>
            <Label>Cupo (opcional)</Label>
            <Input
              type="number"
              min={1}
              value={sessionForm.capacity}
              onChange={(e) => setSessionForm({ ...sessionForm, capacity: e.target.value })}
              placeholder="Usa el cupo del tipo"
            />
          </div>
          {error && (
            <p className="text-center text-xs text-red-500" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" loading={saving}>
            Programar
          </Button>
        </form>
      </Modal>
    </div>
  );
}
