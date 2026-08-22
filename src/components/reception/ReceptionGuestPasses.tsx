import { useCallback, useEffect, useState } from 'react';
import { Ticket, Check, Search, X } from 'lucide-react';
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

interface MemberOption {
  id: number;
  full_name: string;
  cedula?: string | null;
}

const emptyForm = {
  full_name: '',
  cedula: '',
  phone: '',
  notes: '',
  host_user_id: null as number | null,
  host_name: '' as string,
};

export function ReceptionGuestPasses() {
  const toast = useToastOptional();
  const [passes, setPasses] = useState<GuestPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [hostSearch, setHostSearch] = useState('');
  const [hostResults, setHostResults] = useState<MemberOption[]>([]);
  const [searchingHost, setSearchingHost] = useState(false);

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

  const findHost = async () => {
    const term = hostSearch.trim();
    if (!term) return;
    setSearchingHost(true);
    try {
      const res = await apiFetch(`/api/users?q=${encodeURIComponent(term)}&role=member&limit=8`);
      const data = await parseJsonResponse<{ items: MemberOption[] }>(res);
      setHostResults(data.items ?? []);
      if ((data.items ?? []).length === 0) {
        toast?.error('No se encontró un socio con esa búsqueda');
      }
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err, 'No se pudo buscar el anfitrión'));
      setHostResults([]);
    } finally {
      setSearchingHost(false);
    }
  };

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
          host_user_id: form.host_user_id,
        }),
      });
      if (!res.ok) {
        const err = await parseJsonResponse<{ error?: string }>(res);
        throw new Error(err.error || 'No se pudo crear el pase');
      }
      toast?.success('Creaste el pase de invitado');
      setForm(emptyForm);
      setHostSearch('');
      setHostResults([]);
      await load();
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err, 'No se pudo crear el pase'));
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
      toast?.success('Registraste el uso del pase');
      await load();
    } catch (err) {
      toast?.error(toDisplayErrorMessage(err, 'No se pudo registrar el pase'));
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <div className="border-border bg-surface space-y-3 rounded-xl border p-3">
        <div>
          <h3 className="text-text flex items-center gap-2 text-sm font-semibold">
            <Ticket className="text-brand h-4 w-4" />
            Invitados
          </h3>
          <p className="text-text-muted mt-0.5 text-xs">Pase de un día · marca al ingresar</p>
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
          <div className="sm:col-span-2">
            <Label htmlFor="guest-notes">Notas</Label>
            <Input
              id="guest-notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="min-h-11"
              placeholder="Opcional · motivo de la visita"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="guest-host">Anfitrión (socio)</Label>
            {form.host_user_id ? (
              <div className="border-border mt-1 flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3">
                <span className="text-text truncate text-sm font-medium">{form.host_name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 px-2"
                  aria-label="Quitar anfitrión"
                  onClick={() => {
                    setForm((f) => ({ ...f, host_user_id: null, host_name: '' }));
                    setHostResults([]);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="guest-host"
                    value={hostSearch}
                    onChange={(e) => setHostSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void findHost()}
                    className="min-h-11"
                    placeholder="Opcional · cédula o nombre del socio"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void findHost()}
                    loading={searchingHost}
                    disabled={!hostSearch.trim()}
                    className="h-11 w-11 shrink-0 px-0"
                    aria-label="Buscar anfitrión"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {hostResults.length > 0 && (
                  <ul className="divide-border-subtle border-border mt-1.5 divide-y overflow-hidden rounded-xl border">
                    {hostResults.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          className="hover:bg-surface-raised flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm"
                          onClick={() => {
                            setForm((f) => ({
                              ...f,
                              host_user_id: m.id,
                              host_name: m.full_name,
                            }));
                            setHostResults([]);
                            setHostSearch('');
                          }}
                        >
                          <span className="text-text font-medium">{m.full_name}</span>
                          {m.cedula ? (
                            <span className="text-text-muted text-[11px]">{m.cedula}</span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
        <Button className="min-h-11 w-full" loading={saving} onClick={() => void create()}>
          Crear pase
        </Button>
      </div>

      {loading ? (
        <p className="text-text-muted px-1 text-xs">Cargando…</p>
      ) : passes.length === 0 ? (
        <p className="border-border text-text-muted rounded-xl border border-dashed px-3 py-5 text-center text-xs">
          Sin pases hoy. Crea uno cuando llegue un invitado.
        </p>
      ) : (
        <ul className="divide-border-subtle border-border divide-y overflow-hidden rounded-xl border">
          {passes.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-text truncate text-sm font-semibold">{p.full_name}</p>
                <p className="text-text-muted text-[11px]">
                  {p.cedula || 'Sin cédula'}
                  {p.host_name ? ` · anfitrión ${p.host_name}` : ''}
                  {p.notes ? ` · ${p.notes}` : ''}
                  {p.used_at ? (
                    <span className="text-text-muted"> · usado</span>
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
