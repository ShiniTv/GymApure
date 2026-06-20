import { useState, useEffect, type FormEvent } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { Plus, Pencil, Trash2, Calendar, DollarSign } from 'lucide-react';
import { Button, Card, Input, Label, Modal, PageHeader, Spinner, Badge } from '../components/ui';

interface Membership {
  id: number;
  name: string;
  duration_days: number;
  price_usd: number;
}

const emptyForm = { name: '', duration_days: '30', price_usd: '' };

export default function Memberships() {
  const [plans, setPlans] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Membership | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const loadPlans = async () => {
    try {
      const res = await apiFetch('/api/memberships');
      const data = await parseJsonResponse<Membership[]>(res);
      setPlans(Array.isArray(data) ? data : []);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (plan: Membership) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      duration_days: String(plan.duration_days),
      price_usd: String(plan.price_usd),
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const payload = {
      name: form.name.trim(),
      duration_days: Number(form.duration_days),
      price_usd: Number(form.price_usd),
    };

    const url = editingId ? `/api/memberships/${editingId}` : '/api/memberships';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await parseJsonResponse(res);
      setModalOpen(false);
      loadPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    try {
      const res = await apiFetch(`/api/memberships/${deleteTarget.id}`, { method: 'DELETE' });
      await parseJsonResponse(res);
      setDeleteTarget(null);
      loadPlans();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={<>Planes de <span className="text-orange-500">membresía</span></>}
        subtitle="Crea y administra los planes que se asignan al aprobar pagos o manualmente."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-5 w-5" />
            Nuevo plan
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : plans.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="text-sm font-bold text-zinc-500">No hay planes. Crea el primero.</p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="h-5 w-5" />
            Nuevo plan
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} padding="lg" rounded="3xl" className="flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <Badge variant="default" className="mt-2">
                    {plan.duration_days} días
                  </Badge>
                </div>
                <div className="p-3 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-500">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>

              <p className="text-4xl font-bold text-orange-600 dark:text-orange-500 tracking-tight mb-1">
                ${plan.price_usd}
                <span className="text-sm font-bold text-zinc-400 ml-1">USD</span>
              </p>
              <p className="text-xs text-zinc-500 flex items-center gap-1.5 mb-4">
                <Calendar className="h-3.5 w-3.5" />
                Vigencia de {plan.duration_days} días calendario
              </p>

              <div className="mb-6">
                <div className="flex justify-between stat-label mb-2">
                  <span>Costo diario</span>
                  <span>${(plan.price_usd / plan.duration_days).toFixed(2)}/día</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${Math.min(100, (plan.duration_days / 365) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={() => openEdit(plan)}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
                <Button type="button" variant="danger" size="sm" className="flex-1" onClick={() => setDeleteTarget(plan)}>
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={<>{editingId ? 'Editar' : 'Nuevo'} <span className="text-orange-500">plan</span></>}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nombre</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Mensual"
            />
          </div>
          <div>
            <Label>Duración (días)</Label>
            <Input
              type="number"
              required
              min={1}
              value={form.duration_days}
              onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
            />
          </div>
          <div>
            <Label>Precio USD</Label>
            <Input
              type="number"
              required
              min={0.01}
              step={0.01}
              value={form.price_usd}
              onChange={(e) => setForm({ ...form, price_usd: e.target.value })}
            />
          </div>
          {error && <p className="text-xs font-bold text-red-500 text-center">{error}</p>}
          <Button type="submit" className="w-full" size="lg">
            Guardar
          </Button>
        </form>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(''); }}
        title={<>Eliminar <span className="text-red-500">plan</span></>}
      >
        {deleteTarget && (
          <>
            <p className="text-sm text-zinc-500 mb-4">
              ¿Eliminar el plan <strong>{deleteTarget.name}</strong>? Solo es posible si no tiene suscripciones activas.
            </p>
            {deleteError && <p className="text-sm font-bold text-red-500 mb-4">{deleteError}</p>}
            <div className="flex gap-4">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="danger" className="flex-1" onClick={handleDelete}>
                Eliminar
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
