import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Search, Upload } from 'lucide-react';
import { apiFetch, parseJsonResponse, parseJsonSafe } from '../../lib/api';
import { Button, Card, Input, Label } from '../ui';

interface MemberOption {
  id: number;
  full_name: string;
  cedula: string | null;
  role: string;
}

interface MembershipPlan {
  id: number;
  name: string;
  duration_days: number;
  price_usd: number;
}

const PAYMENT_METHODS = ['efectivo', 'pago_movil', 'transferencia', 'zelle'] as const;

export function ReceptionRenewPayWizard({ onComplete }: { onComplete?: () => void }) {
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [membershipId, setMembershipId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>('efectivo');
  const [reference, setReference] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    apiFetch('/api/memberships')
      .then((res) => parseJsonResponse<MembershipPlan[]>(res))
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .catch(() => setPlans([]));
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((plan) => String(plan.id) === membershipId),
    [membershipId, plans]
  );

  const findMembers = async () => {
    const term = search.trim();
    if (!term) return;
    setLoadingSearch(true);
    setError('');
    try {
      const res = await apiFetch(`/api/users?q=${encodeURIComponent(term)}&role=member&limit=10`);
      const data = await parseJsonResponse<{ items: MemberOption[] }>(res);
      setMembers(data.items ?? []);
      if ((data.items ?? []).length === 0) setError('No se encontraron socios con esa búsqueda');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo buscar');
    } finally {
      setLoadingSearch(false);
    }
  };

  const choosePlan = (id: string) => {
    setMembershipId(id);
    const plan = plans.find((item) => String(item.id) === id);
    if (plan) setAmount(String(plan.price_usd));
  };

  const submit = async () => {
    if (!selectedMember || !membershipId || !amount || Number(amount) <= 0) {
      setError('Selecciona el socio, el plan y un monto válido');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const form = new FormData();
      form.append('user_id', String(selectedMember.id));
      form.append('membership_id', membershipId);
      form.append('amount_usd', amount);
      form.append('method', method);
      if (reference.trim()) form.append('reference', reference.trim());
      if (proof) form.append('proof', proof);
      const res = await apiFetch('/api/reception/renew', { method: 'POST', body: form });
      const data = await parseJsonSafe<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'No se pudo registrar la renovación');
      setSuccess(`Renovación y pago aprobados para ${selectedMember.full_name}`);
      setReference('');
      setProof(null);
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la renovación');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card padding="md" rounded="xl" className="mx-auto max-w-2xl space-y-5">
      <div>
        <h2 className="section-title">Renovar y cobrar</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          El pago se aprueba y la membresía se renueva en una sola operación.
        </p>
      </div>

      <div>
        <Label>Buscar socio por nombre o cédula</Label>
        <div className="flex gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void findMembers()}
            placeholder="Ej. V-12345678 o Ana Pérez"
          />
          <Button
            onClick={() => void findMembers()}
            loading={loadingSearch}
            disabled={!search.trim()}
          >
            <Search className="h-4 w-4" />
            Buscar
          </Button>
        </div>
        {members.length > 0 && (
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-zinc-200 p-2 dark:border-zinc-700">
            {members.map((member) => (
              <button
                type="button"
                key={member.id}
                onClick={() => {
                  setSelectedMember(member);
                  setMembers([]);
                  setError('');
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {member.full_name}
                </span>
                <span className="ml-2 text-zinc-500">{member.cedula ?? 'Sin cédula'}</span>
              </button>
            ))}
          </div>
        )}
        {selectedMember && (
          <p className="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            Socio: {selectedMember.full_name} · {selectedMember.cedula ?? 'Sin cédula'}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Plan</Label>
          <select
            className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-bold dark:border-zinc-700 dark:bg-zinc-800"
            value={membershipId}
            onChange={(event) => choosePlan(event.target.value)}
          >
            <option value="">Seleccionar plan…</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} — {plan.duration_days} días — ${plan.price_usd}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Monto USD</Label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={selectedPlan ? String(selectedPlan.price_usd) : '0.00'}
          />
        </div>
        <div>
          <Label>Método de pago</Label>
          <select
            className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-bold dark:border-zinc-700 dark:bg-zinc-800"
            value={method}
            onChange={(event) => setMethod(event.target.value as typeof method)}
          >
            {PAYMENT_METHODS.map((value) => (
              <option key={value} value={value}>
                {value.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Referencia (opcional)</Label>
          <Input value={reference} onChange={(event) => setReference(event.target.value)} />
        </div>
      </div>

      <div>
        <Label>Comprobante (opcional)</Label>
        <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-700">
          <Upload className="h-4 w-4" />
          {proof?.name ?? 'Subir JPG, PNG, WebP o PDF'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            onChange={(event) => setProof(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {error && <p className="text-sm font-medium text-red-500">{error}</p>}
      {success && (
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4" />
          {success}
        </p>
      )}
      <Button className="w-full" size="lg" loading={submitting} onClick={() => void submit()}>
        Aprobar pago y renovar
      </Button>
    </Card>
  );
}

export default ReceptionRenewPayWizard;
