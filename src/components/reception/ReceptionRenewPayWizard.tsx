import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Search, Upload } from 'lucide-react';
import { apiFetch, parseJsonResponse, parseJsonSafe } from '../../lib/api';
import { Button, Input, Label } from '../ui';

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

const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'pago_movil', label: 'Pago móvil' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'zelle', label: 'Zelle' },
] as const;

export function ReceptionRenewPayWizard({
  onComplete,
  initialMember,
}: {
  onComplete?: () => void;
  initialMember?: { id: number; full_name: string; cedula: string | null } | null;
}) {
  const [search, setSearch] = useState(initialMember?.cedula ?? initialMember?.full_name ?? '');
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(
    initialMember
      ? {
          id: initialMember.id,
          full_name: initialMember.full_name,
          cedula: initialMember.cedula,
          role: 'member',
        }
      : null
  );
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [membershipId, setMembershipId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]['value']>('efectivo');
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
      setSuccess(`Renovación aprobada para ${selectedMember.full_name}`);
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
    <div className="mx-auto max-w-2xl space-y-3 rounded-xl border border-zinc-200/70 bg-white/80 p-3 sm:p-4 dark:border-zinc-800/80 dark:bg-zinc-900/50">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Renovar y cobrar</h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Pago aprobado y membresía renovada en un paso.
        </p>
      </div>

      <div>
        <Label>Socio</Label>
        <div className="mt-1 flex gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void findMembers()}
            placeholder="Cédula o nombre"
            className="min-h-11"
          />
          <Button
            variant="ghost"
            onClick={() => void findMembers()}
            loading={loadingSearch}
            disabled={!search.trim()}
            className="h-11 w-11 shrink-0 px-0"
            aria-label="Buscar socio"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {members.length > 0 && (
          <div className="mt-2 max-h-40 space-y-0.5 overflow-y-auto rounded-xl border border-zinc-200/70 dark:border-zinc-800">
            {members.map((member) => (
              <button
                type="button"
                key={member.id}
                onClick={() => {
                  setSelectedMember(member);
                  setMembers([]);
                  setError('');
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              >
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {member.full_name}
                </span>
                <span className="ml-2 text-xs text-zinc-500">{member.cedula ?? 'Sin cédula'}</span>
              </button>
            ))}
          </div>
        )}
        {selectedMember && (
          <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {selectedMember.full_name} · {selectedMember.cedula ?? 'Sin cédula'}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Plan</Label>
          <select
            className="mt-1 min-h-11 w-full rounded-xl border border-zinc-200 bg-transparent px-3 text-sm font-medium dark:border-zinc-700"
            value={membershipId}
            onChange={(event) => choosePlan(event.target.value)}
          >
            <option value="">Seleccionar…</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} — {plan.duration_days}d — ${plan.price_usd}
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
            className="min-h-11"
          />
        </div>
        <div>
          <Label>Método</Label>
          <select
            className="mt-1 min-h-11 w-full rounded-xl border border-zinc-200 bg-transparent px-3 text-sm font-medium dark:border-zinc-700"
            value={method}
            onChange={(event) => setMethod(event.target.value as typeof method)}
          >
            {PAYMENT_METHODS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Referencia (opcional)</Label>
          <Input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            className="min-h-11"
          />
        </div>
      </div>

      <div>
        <Label>Comprobante (opcional)</Label>
        <label className="mt-1 flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-3 text-xs text-zinc-500 dark:border-zinc-700">
          <Upload className="h-3.5 w-3.5" />
          {proof?.name ?? 'JPG, PNG, WebP o PDF'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            onChange={(event) => setProof(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
      {success && (
        <p className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="h-3.5 w-3.5" />
          {success}
        </p>
      )}
      <Button className="min-h-11 w-full" loading={submitting} onClick={() => void submit()}>
        Aprobar y renovar
      </Button>
    </div>
  );
}

export default ReceptionRenewPayWizard;
