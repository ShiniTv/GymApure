import { useCallback, useEffect, useState } from 'react';
import { Ticket, Check } from 'lucide-react';
import { apiFetch, parseJsonResponse, toDisplayErrorMessage } from '../../lib/api';
import { Button, Card, Input, Label, EmptyState } from '../ui';
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
      toast?.success('Pase de invitado creado');
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
      toast?.success('Pase marcado como usado');
      await load();
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err, 'Error'));
    }
  };

  return (
    <div className="page-stack max-w-2xl">
      <Card padding="md" rounded="2xl" className="space-y-3">
        <h3 className="section-title flex items-center gap-2">
          <Ticket className="text-brand h-4 w-4" />
          Pase de invitado (hoy)
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Acceso de un día sin membresía. Marque como usado al ingresar.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="guest-name">Nombre</Label>
            <Input
              id="guest-name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="guest-cedula">Cédula (opcional)</Label>
            <Input
              id="guest-cedula"
              value={form.cedula}
              onChange={(e) => setForm((f) => ({ ...f, cedula: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="guest-phone">Teléfono (opcional)</Label>
            <Input
              id="guest-phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
        </div>
        <Button className="w-full" loading={saving} onClick={() => void create()}>
          Crear pase
        </Button>
      </Card>

      {loading ? (
        <p className="text-sm text-zinc-500">Cargando…</p>
      ) : passes.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Sin pases hoy"
          description="Crea un pase cuando llegue un invitado."
        />
      ) : (
        <ul className="space-y-2">
          {passes.map((p) => (
            <li key={p.id}>
              <Card padding="sm" rounded="xl" className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                    {p.full_name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {p.cedula || 'Sin cédula'}
                    {p.used_at ? ' · usado' : ' · pendiente'}
                  </p>
                </div>
                {!p.used_at && (
                  <Button size="sm" variant="secondary" onClick={() => void markUsed(p.id)}>
                    <Check className="h-4 w-4" />
                    Usar
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
