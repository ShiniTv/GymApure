import { useState, useEffect, type FormEvent } from 'react';
import { apiFetch, parseJsonResponse, connectionOrApiError } from '../lib/api';
import { Plus, Pencil, Trash2, DollarSign, AlertTriangle } from 'lucide-react';
import {
  Button,
  Card,
  Input,
  Label,
  Modal,
  PageHeader,
  Spinner,
  Badge,
  EmptyState,
  BackToDashboardLink,
} from '../components/ui';

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
  const [loadError, setLoadError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Membership | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPlans = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await apiFetch('/api/memberships');
      const data = await parseJsonResponse<Membership[]>(res);
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      setPlans([]);
      setLoadError(connectionOrApiError(err, 'No se pudieron cargar los planes'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPlans();
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
    setSaving(true);

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
      void loadPlans();
    } catch (err) {
      setError(connectionOrApiError(err, 'Error al guardar'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/memberships/${deleteTarget.id}`, { method: 'DELETE' });
      await parseJsonResponse(res);
      setDeleteTarget(null);
      void loadPlans();
    } catch (err) {
      setDeleteError(connectionOrApiError(err, 'No se pudo eliminar'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-stack-tight mx-auto w-full max-w-7xl">
      <PageHeader
        compact
        title={
          <>
            Planes de <span className="text-brand">membresía</span>
          </>
        }
        subtitle="Crea y administra los planes que se asignan al aprobar pagos o manualmente."
        action={
          <div className="flex shrink-0 items-center gap-2">
            <BackToDashboardLink />
            <Button
              size="sm"
              className="h-11 min-h-11 w-11 shrink-0 rounded-xl p-0 whitespace-nowrap sm:w-auto sm:px-4"
              onClick={openCreate}
              aria-label="Nuevo plan"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Nuevo plan</span>
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : loadError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No se pudieron cargar los planes"
          description={loadError}
          action={<Button onClick={() => void loadPlans()}>Reintentar</Button>}
        />
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {plans.map((plan) => {
            const dailyCost = (plan.price_usd / plan.duration_days).toFixed(2);
            return (
              <Card key={plan.id} padding="sm" rounded="xl" className="flex flex-col md:p-4">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base leading-tight font-bold text-zinc-900 dark:text-white">
                        {plan.name}
                      </h3>
                      <Badge variant="default">{plan.duration_days} días</Badge>
                    </div>
                    <p className="text-brand mt-2 text-xl font-bold tracking-tight tabular-nums">
                      ${plan.price_usd}
                      <span className="ml-1 text-xs font-semibold text-zinc-400 dark:text-zinc-300">
                        USD
                      </span>
                      <span className="ml-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        · ${dailyCost}/día
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 rounded-xl px-0"
                      onClick={() => {
                        openEdit(plan);
                      }}
                      aria-label="Editar plan"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="h-9 w-9 rounded-xl px-0"
                      onClick={() => {
                        setDeleteTarget(plan);
                      }}
                      aria-label="Eliminar plan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          if (!saving) setModalOpen(false);
        }}
        maxWidth="lg"
        title={
          <>
            {editingId ? 'Editar' : 'Nuevo'} <span className="text-brand">plan</span>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nombre</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
              }}
              placeholder="Ej: Mensual"
            />
          </div>
          <div className="max-w-[8rem]">
            <Label>Duración (días)</Label>
            <Input
              type="number"
              required
              min={1}
              value={form.duration_days}
              onChange={(e) => {
                setForm({ ...form, duration_days: e.target.value });
              }}
            />
          </div>
          <div className="max-w-[10rem]">
            <Label>Precio USD</Label>
            <Input
              type="number"
              required
              min={0.01}
              step={0.01}
              value={form.price_usd}
              onChange={(e) => {
                setForm({ ...form, price_usd: e.target.value });
              }}
            />
          </div>
          {error && (
            <p className="text-center text-xs font-bold text-red-500" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" size="lg" loading={saving}>
            Guardar
          </Button>
        </form>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => {
          if (deleting) return;
          setDeleteTarget(null);
          setDeleteError('');
        }}
        title={
          <>
            Eliminar <span className="text-red-500">plan</span>
          </>
        }
      >
        {deleteTarget && (
          <>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              ¿Eliminar el plan <strong>{deleteTarget.name}</strong>? Solo es posible si no tiene
              suscripciones activas.
            </p>
            {deleteError && (
              <p className="mb-4 text-sm font-bold text-red-500" role="alert">
                {deleteError}
              </p>
            )}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                disabled={deleting}
                onClick={() => {
                  setDeleteTarget(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                className="flex-1"
                loading={deleting}
                onClick={handleDelete}
              >
                Eliminar
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
