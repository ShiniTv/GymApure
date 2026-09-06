import { useEffect, useState } from 'react';
import { Button, Card, Input, Label } from '../../components/ui';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import { useToastOptional } from '../../context/ToastContext';

interface TrainingBlock {
  id: number;
  name: string;
  objective: string;
  start_date: string;
  end_date: string;
  status: 'planned' | 'active' | 'completed' | 'archived';
  intensity_method: 'manual' | 'rpe_rir' | 'percent_1rm' | 'double_progression';
  notes: string | null;
  approved_at: string | null;
  last_reviewed_at: string | null;
}

function isReviewDue(block: TrainingBlock) {
  if (block.status !== 'active') return false;
  const lastReview = block.last_reviewed_at ?? block.approved_at;
  return lastReview ? Date.now() - new Date(lastReview).getTime() >= 7 * 86_400_000 : true;
}

export function MemberTrainingBlocksPanel({ memberId }: { memberId: number }) {
  const toast = useToastOptional();
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);
  const [form, setForm] = useState({
    name: '',
    objective: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    intensity_method: 'manual',
    notes: '',
  });

  const load = async () => {
    const response = await apiFetch(`/api/users/${memberId}/training-blocks`);
    setBlocks(await parseJsonResponse<TrainingBlock[]>(response));
  };

  useEffect(() => {
    void load();
  }, [memberId]);

  const create = async () => {
    try {
      const response = await apiFetch(`/api/users/${memberId}/training-blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, notes: form.notes || null }),
      });
      const created = await parseJsonResponse<TrainingBlock>(response);
      setBlocks((current) => [created, ...current]);
      setForm({ ...form, name: '', objective: '', notes: '' });
      toast?.success('Bloque creado');
    } catch (error) {
      toast?.error(error instanceof Error ? error.message : 'No se pudo crear el bloque');
    }
  };

  const updateStatus = async (blockId: number, status: TrainingBlock['status']) => {
    try {
      const response = await apiFetch(`/api/users/${memberId}/training-blocks/${blockId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const updated = await parseJsonResponse<{ id: number; status: TrainingBlock['status'] }>(
        response
      );
      setBlocks((current) =>
        current.map((block) =>
          block.id === updated.id ? { ...block, status: updated.status } : block
        )
      );
      toast?.success('Estado del bloque actualizado');
    } catch (error) {
      toast?.error(error instanceof Error ? error.message : 'No se pudo actualizar el bloque');
    }
  };

  const markReviewed = async (blockId: number) => {
    try {
      const response = await apiFetch(`/api/users/${memberId}/training-blocks/${blockId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      const updated = await parseJsonResponse<{ id: number; last_reviewed_at: string }>(response);
      setBlocks((current) =>
        current.map((block) =>
          block.id === updated.id ? { ...block, last_reviewed_at: updated.last_reviewed_at } : block
        )
      );
      toast?.success('Revisión del bloque registrada');
    } catch (error) {
      toast?.error(error instanceof Error ? error.message : 'No se pudo registrar la revisión');
    }
  };

  return (
    <div className="space-y-4">
      <Card padding="md" rounded="xl">
        <h2 className="text-text text-sm font-semibold">Nuevo bloque</h2>
        <p className="text-text-muted mt-1 text-xs">
          Define una etapa con objetivo e intensidad; las progresiones siempre requieren revisión
          del trainer.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Nombre</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Base de fuerza"
            />
          </div>
          <div>
            <Label>Objetivo</Label>
            <Input
              value={form.objective}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
              placeholder="Mejorar sentadilla"
            />
          </div>
          <div>
            <Label>Inicio</Label>
            <Input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>
          <div>
            <Label>Fin</Label>
            <Input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </div>
          <div>
            <Label>Método de intensidad</Label>
            <select
              value={form.intensity_method}
              onChange={(e) => setForm({ ...form, intensity_method: e.target.value })}
              className="border-border bg-surface text-text h-10 w-full rounded-lg border px-2 text-sm"
            >
              <option value="manual">Manual</option>
              <option value="rpe_rir">RPE / RIR</option>
              <option value="percent_1rm">% 1RM</option>
              <option value="double_progression">Doble progresión</option>
            </select>
          </div>
        </div>
        <Button
          className="mt-4"
          size="sm"
          disabled={!form.name || !form.objective || !form.end_date}
          onClick={() => void create()}
        >
          Crear bloque
        </Button>
      </Card>
      {blocks.map((block) => (
        <Card key={block.id} padding="sm" rounded="xl">
          <p className="text-text text-sm font-semibold">{block.name}</p>
          <p className="text-text-muted mt-1 text-xs">
            {block.objective} · {block.start_date} → {block.end_date}
          </p>
          <p className="text-text-muted text-small mt-1">
            {block.intensity_method.replaceAll('_', ' ')} · {block.status}
          </p>
          {block.status === 'active' && (
            <p className="text-text-muted text-small mt-1">
              {isReviewDue(block)
                ? 'Revisión pendiente'
                : `Última revisión: ${new Date(
                    block.last_reviewed_at ?? block.approved_at ?? Date.now()
                  ).toLocaleDateString('es-VE')}`}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {block.status !== 'active' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void updateStatus(block.id, 'active')}
              >
                Activar
              </Button>
            )}
            {isReviewDue(block) && (
              <Button size="sm" variant="secondary" onClick={() => void markReviewed(block.id)}>
                Marcar revisado
              </Button>
            )}
            {block.status === 'active' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void updateStatus(block.id, 'completed')}
              >
                Completar
              </Button>
            )}
            {block.status !== 'archived' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void updateStatus(block.id, 'archived')}
              >
                Archivar
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
