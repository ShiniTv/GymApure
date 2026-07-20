import { useCallback, useEffect, useState } from 'react';
import { Ticket, Check } from 'lucide-react';
import { apiFetch, parseJsonResponse, toDisplayErrorMessage } from '../../lib/api';
import { Button, Input, Label } from '../ui';
import { useToastOptional } from '../../context/ToastContext';

interface GuestPass {
  id: number;
  full_name: string;
  cedula: string | null;
  phone: string | null;
  notes: string | null;
  valid_date: string;
  used_at: string | null;
  host_name?: string | null;
}

export function ReceptionGuestPasses() {
  const toast = useToastOptional();
  const [passes, setPasses] = useState<GuestPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', cedula: '', phone: '', notes: '' });

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/guest-passes');
      const data = await parseJsonResponse<GuestPass[]>(res);
      setPasses(Array.isArray(data) ? data : []);
    } catch {
      setPasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!form.full_name.trim()) {
      toast?.error('Nombre requerido');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/api/guest-passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          cedula: form.cedula.trim() || null,
          phone: form.phone.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await parseJsonResponse<{ error?: string }>(res);
        throw new Error(err.error || 'No se pudo crear el pase');
      }
      toast?.success('Pase creado');
      setForm({ full_name: '', cedula: '', phone: '', notes: '' });
      await load();
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err, 'Error al crear pase'));
    } finally {
      setSaving(false);
    }
  };

  const markUsed = async (id: number) => {
    try {
      const res = await apiFetch(`/api/guest-passes/${id}/use`, { method: 'POST' });
      if (!res.ok) {
        const err = await parseJsonResponse<{ error?: string }>(res);
        throw new Error(err.error || 'No se pudo marcar');
      }
      toast?.success('Pase usado');
      await load();
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err, 'Error'));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="space-y-3 rounded-xl border border-zinc-200/70 bg-white/80 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/50">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
            <Ticket className="text-brand h-4 w-4" />
            Invitados
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Pase de un día · marca al ingresar
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="guest-name">Nombre</Label>
            <Input
              id="guest-name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className="min-h-11"
              placeholder="Nombre del invitado"
            />
          </div>
          <div>
            <Label htmlFor="guest-cedula">Cédula</Label>
            <Input
              id="guest-cedula"
              value={form.cedula}
              onChange={(e) => setForm((f) => ({ ...f, cedula: e.target.value }))}
              className="min-h-11"
              placeholder="Opcional"
            />
          </div>
          <div>
            <Label htmlFor="guest-phone">Teléfono</Label>
            <Input
              id="guest-phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="min-h-11"
              placeholder="Opcional"
            />
          </div>
        </div>
        <Button className="min-h-11 w-full" loading={saving} onClick={() => void create()}>
          Crear pase
        </Button>
      </div>

      {loading ? (
        <p className="px-1 text-xs text-zinc-500">Cargando…</p>
      ) : passes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-3 py-5 text-center text-xs text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
          Sin pases hoy. Crea uno cuando llegue un invitado.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200/70 dark:divide-zinc-800 dark:border-zinc-800/80">
          {passes.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                  {p.full_name}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {p.cedula || 'Sin cédula'}
                  {p.used_at ? (
                    <span className="text-zinc-400"> · usado</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400"> · pendiente</span>
                  )}
                </p>
              </div>
              {!p.used_at && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 shrink-0 gap-1 px-2.5 text-xs"
                  onClick={() => void markUsed(p.id)}
                >
                  <Check className="h-3.5 w-3.5" />
                  Usar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
