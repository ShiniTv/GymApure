import { useState, useEffect, type FormEvent } from 'react';
import { apiFetch } from '../lib/api';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const loadPlans = () => {
    apiFetch('/api/memberships')
      .then((res) => res.json())
      .then((data) => {
        setPlans(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setPlans([]);
        setLoading(false);
      });
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

    const res = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error al guardar');
      return;
    }

    setModalOpen(false);
    loadPlans();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este plan? Solo es posible si no tiene suscripciones activas.')) return;

    const res = await apiFetch(`/api/memberships/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'No se pudo eliminar');
      return;
    }
    loadPlans();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase">
            PLANES DE <span className="text-orange-500">MEMBRESÍA</span>
          </h1>
          <p className="text-zinc-500 font-medium">
            Crea y administra los planes que se asignan a los miembros al aprobar pagos o manualmente.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-900/20"
        >
          <Plus className="h-5 w-5" />
          Nuevo plan
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-zinc-500">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 uppercase font-black text-[10px] tracking-widest">
            <tr>
              <th className="px-8 py-5">Plan</th>
              <th className="px-8 py-5">Duración</th>
              <th className="px-8 py-5">Precio USD</th>
              <th className="px-8 py-5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-8 py-12 text-center uppercase tracking-widest text-[10px]">
                  Cargando planes...
                </td>
              </tr>
            ) : plans.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-8 py-12 text-center uppercase tracking-widest text-[10px]">
                  No hay planes. Crea el primero.
                </td>
              </tr>
            ) : (
              plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-8 py-5 font-black text-zinc-800 dark:text-zinc-200 uppercase">{plan.name}</td>
                  <td className="px-8 py-5">{plan.duration_days} días</td>
                  <td className="px-8 py-5 font-black text-orange-600 dark:text-orange-500">${plan.price_usd}</td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(plan)}
                        className="p-2 text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg"
                        title="Editar"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                        title="Eliminar"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase italic tracking-tighter text-zinc-900 dark:text-white">
                {editingId ? 'Editar' : 'Nuevo'} <span className="text-orange-500">plan</span>
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Nombre</label>
                <input
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-orange-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Mensual"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Duración (días)</label>
                <input
                  type="number"
                  required
                  min={1}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-orange-500"
                  value={form.duration_days}
                  onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Precio USD</label>
                <input
                  type="number"
                  required
                  min={0.01}
                  step={0.01}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-orange-500"
                  value={form.price_usd}
                  onChange={(e) => setForm({ ...form, price_usd: e.target.value })}
                />
              </div>
              {error && <p className="text-xs font-bold text-red-500 text-center">{error}</p>}
              <button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest"
              >
                Guardar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
