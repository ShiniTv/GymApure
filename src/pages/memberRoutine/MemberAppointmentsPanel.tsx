import { useEffect, useState } from 'react';
import { Badge, Button, Card, Input, Label } from '../../components/ui';
import { useToastOptional } from '../../context/ToastContext';
import { apiFetch, parseJsonResponse } from '../../lib/api';

interface Appointment {
  id: number;
  member_id: number;
  member_name?: string;
  training_block_id: number | null;
  starts_at: string;
  ends_at: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
}

interface TrainingBlock {
  id: number;
  name: string;
  status: string;
}

function toLocalDateTime(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

const statusLabels: Record<Appointment['status'], string> = {
  scheduled: 'Agendada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

export function MemberAppointmentsPanel({ memberId }: { memberId: number }) {
  const toast = useToastOptional();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    starts_at: '',
    ends_at: '',
    training_block_id: '',
    notes: '',
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({ starts_at: '', ends_at: '', training_block_id: '', notes: '' });
  };

  const load = async () => {
    const [appointmentsResponse, blocksResponse] = await Promise.all([
      apiFetch('/api/appointments'),
      apiFetch(`/api/users/${memberId}/training-blocks`),
    ]);
    const [allAppointments, trainingBlocks] = await Promise.all([
      parseJsonResponse<Appointment[]>(appointmentsResponse),
      parseJsonResponse<TrainingBlock[]>(blocksResponse),
    ]);
    setAppointments(allAppointments.filter((appointment) => appointment.member_id === memberId));
    setBlocks(trainingBlocks);
  };

  useEffect(() => {
    void load().catch(() => toast?.error('No se pudieron cargar las sesiones 1:1'));
  }, [memberId]);

  const save = async () => {
    if (!form.starts_at || !form.ends_at || new Date(form.ends_at) <= new Date(form.starts_at)) {
      toast?.error('Indica un horario de inicio y fin válido');
      return;
    }
    try {
      const payload = {
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        training_block_id: form.training_block_id ? Number(form.training_block_id) : null,
        notes: form.notes.trim() || null,
      };
      const response = await apiFetch(
        editingId ? `/api/appointments/${editingId}` : '/api/appointments',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingId ? payload : { ...payload, member_id: memberId }),
        }
      );
      const saved = await parseJsonResponse<Appointment>(response);
      setAppointments((current) =>
        editingId
          ? current.map((appointment) => (appointment.id === saved.id ? saved : appointment))
          : [...current, saved].sort(
              (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
            )
      );
      resetForm();
      toast?.success(editingId ? 'Sesión reprogramada' : 'Sesión 1:1 agendada');
    } catch (error) {
      toast?.error(error instanceof Error ? error.message : 'No se pudo guardar la sesión');
    }
  };

  const updateStatus = async (appointment: Appointment, status: Appointment['status']) => {
    try {
      const response = await apiFetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const updated = await parseJsonResponse<Appointment>(response);
      setAppointments((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      toast?.success(`Sesión ${statusLabels[status].toLowerCase()}`);
    } catch (error) {
      toast?.error(error instanceof Error ? error.message : 'No se pudo actualizar la sesión');
    }
  };

  const edit = (appointment: Appointment) => {
    setEditingId(appointment.id);
    setForm({
      starts_at: toLocalDateTime(appointment.starts_at),
      ends_at: toLocalDateTime(appointment.ends_at),
      training_block_id: appointment.training_block_id?.toString() ?? '',
      notes: appointment.notes ?? '',
    });
  };

  return (
    <div className="space-y-4">
      <Card padding="md" rounded="xl">
        <h2 className="text-text text-sm font-semibold">
          {editingId ? 'Reprogramar sesión 1:1' : 'Agendar sesión 1:1'}
        </h2>
        <p className="text-text-muted mt-1 text-xs">
          Agenda tiempo individual y relaciónalo al bloque de entrenamiento cuando corresponda.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="appointment-start">Inicio</Label>
            <Input
              id="appointment-start"
              type="datetime-local"
              value={form.starts_at}
              onChange={(event) => setForm({ ...form, starts_at: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="appointment-end">Fin</Label>
            <Input
              id="appointment-end"
              type="datetime-local"
              value={form.ends_at}
              onChange={(event) => setForm({ ...form, ends_at: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="appointment-block">Bloque</Label>
            <select
              id="appointment-block"
              value={form.training_block_id}
              onChange={(event) => setForm({ ...form, training_block_id: event.target.value })}
              className="border-border bg-surface text-text h-10 w-full rounded-lg border px-2 text-sm"
            >
              <option value="">Sin bloque específico</option>
              {blocks
                .filter((block) => block.status !== 'archived')
                .map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.name} · {block.status}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <Label htmlFor="appointment-notes">Notas</Label>
            <Input
              id="appointment-notes"
              value={form.notes}
              maxLength={2000}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Objetivo de la sesión"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button size="sm" disabled={!form.starts_at || !form.ends_at} onClick={() => void save()}>
            {editingId ? 'Guardar cambio' : 'Agendar sesión'}
          </Button>
          {editingId && (
            <Button size="sm" variant="secondary" onClick={resetForm}>
              Cancelar edición
            </Button>
          )}
        </div>
      </Card>

      {appointments.length === 0 ? (
        <Card padding="md" rounded="xl">
          <p className="text-text-muted text-sm">
            No hay sesiones 1:1 registradas para este cliente.
          </p>
        </Card>
      ) : (
        appointments.map((appointment) => (
          <Card key={appointment.id} padding="sm" rounded="xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-text text-sm font-semibold">
                {new Intl.DateTimeFormat('es-VE', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(appointment.starts_at))}
              </p>
              <Badge>{statusLabels[appointment.status]}</Badge>
            </div>
            {appointment.notes && (
              <p className="text-text-muted mt-1 text-xs">{appointment.notes}</p>
            )}
            {appointment.status === 'scheduled' && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => edit(appointment)}>
                  Reprogramar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void updateStatus(appointment, 'completed')}
                >
                  Completar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void updateStatus(appointment, 'no_show')}
                >
                  No asistió
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void updateStatus(appointment, 'cancelled')}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
