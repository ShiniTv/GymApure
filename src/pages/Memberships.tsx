import { useState, useEffect, type FormEvent } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { Plus, Pencil, Trash2, Calendar, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, Input, Label, Modal, PageHeader, Spinner, Badge, EmptyState } from '../components/ui';

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
    <div className="page-stack">
      <PageHeader
        compact
        title={<>Planes de <span className="text-brand">membresía</span></>}
        subtitle="Crea y administra los planes que se asignan al aprobar pagos o manualmente."
      />

      <div className="flex flex-wrap gap-2 justify-end">
        <Link
          to="/members?shift=diurno"
          className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-brand px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800"
        >
          Miembros diurno
        </Link>
        <Link
          to="/members?shift=vespertino"
          className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-brand px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800"
        >
          Miembros vespertino
        </Link>
        <Link
          to="/members?shift=nocturno"
          className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-brand px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800"
        >
          Miembros nocturno
        </Link>
        <Button
          size="sm"
          className="h-11 min-h-11 w-11 shrink-0 rounded-xl p-0 sm:w-auto sm:px-4 whitespace-nowrap"
          onClick={openCreate}
          aria-label="Nuevo plan"
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">Nuevo plan</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No hay planes de membresía"
          description="Crea el primer plan para asignarlo al aprobar pagos o manualmente."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-5 w-5" />
              Nuevo plan
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {plans.map((plan) => {
            const dailyCost = (plan.price_usd / plan.duration_days).toFixed(2);
            return (
              <Card key={plan.id} padding="md" rounded="xl" className="flex flex-col">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white truncate leading-tight">
                      {plan.name}
                    </h3>
                    <Badge variant="default" className="mt-1.5">
                      {plan.duration_days} días
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 px-0 rounded-xl"
                      onClick={() => { openEdit(plan); }}
                      aria-label="Editar plan"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="h-9 w-9 px-0 rounded-xl"
                      onClick={() => { setDeleteTarget(plan); }}
                      aria-label="Eliminar plan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <p className="mt-3 text-2xl sm:text-3xl font-bold text-brand dark:text-brand tracking-tight tabular-nums">
                  ${plan.price_usd}
                  <span className="text-xs sm:text-sm font-semibold text-zinc-400 dark:text-zinc-300 ml-1">USD</span>
                </p>

                <p className="mt-1.5 text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>{plan.duration_days} días calendario</span>
                  <span className="text-zinc-300 dark:text-zinc-600">·</span>
                  <span className="font-medium">${dailyCost}/día</span>
                </p>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); }}
        title={<>{editingId ? 'Editar' : 'Nuevo'} <span className="text-brand">plan</span></>}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nombre</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => { setForm({ ...form, name: e.target.value }); }}
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
              onChange={(e) => { setForm({ ...form, duration_days: e.target.value }); }}
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
              onChange={(e) => { setForm({ ...form, price_usd: e.target.value }); }}
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
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              ¿Eliminar el plan <strong>{deleteTarget.name}</strong>? Solo es posible si no tiene suscripciones activas.
            </p>
            {deleteError && <p className="text-sm font-bold text-red-500 mb-4">{deleteError}</p>}
            <div className="flex gap-4">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => { setDeleteTarget(null); }}>
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
