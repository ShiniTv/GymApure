import { useState, useEffect, useMemo } from 'react';
import { UserPlus, ChevronRight, ChevronLeft, CheckCircle, Copy, Fingerprint } from 'lucide-react';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import { Button, Card, Input, Label, Select, Spinner } from '../../components/ui';
import { cn } from '../../lib/utils';

interface MembershipPlan {
  id: number;
  name: string;
  duration_days: number;
  price_usd: number;
}

interface WalkInSuccess {
  user: { id: number; full_name: string; email: string; cedula: string };
  membership_name: string;
  temporary_password: string;
  checked_in: boolean;
  check_in_message?: string;
  subscription: { startDate: string; endDate: string };
}

interface ReceptionWalkInWizardProps {
  onComplete?: () => void;
}

const STEPS = ['Datos', 'Plan', 'Pago', 'Confirmar'] as const;

const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'pago_movil', label: 'Pago móvil' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'zelle', label: 'Zelle' },
];

export default function ReceptionWalkInWizard({ onComplete }: ReceptionWalkInWizardProps) {
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<WalkInSuccess | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    cedula: '',
    email: '',
    phone: '',
    membership_id: '',
    method: 'efectivo',
    reference: '',
    check_in: true,
  });

  useEffect(() => {
    apiFetch('/api/memberships')
      .then((res) => parseJsonResponse<MembershipPlan[]>(res))
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .catch(() => setPlans([]))
      .finally(() => setLoadingPlans(false));
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((p) => String(p.id) === form.membership_id),
    [plans, form.membership_id]
  );

  const validateStep = (index: number): string | null => {
    if (index === 0) {
      if (!form.full_name.trim() || form.full_name.trim().length < 3) return 'Nombre completo requerido (mín. 3 caracteres)';
      const cedulaRegex = /^([VEve]-)?\d{5,10}$/;
      if (!cedulaRegex.test(form.cedula.trim())) return 'Cédula inválida (ej: V-12345678)';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Email inválido';
    }
    if (index === 1 && !form.membership_id) return 'Seleccione un plan de membresía';
    if (index === 2 && !form.method.trim()) return 'Seleccione método de pago';
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
  };

  const resetWizard = () => {
    setStep(0);
    setSuccess(null);
    setError('');
    setCopied(false);
    setForm({
      full_name: '',
      cedula: '',
      email: '',
      phone: '',
      membership_id: '',
      method: 'efectivo',
      reference: '',
      check_in: true,
    });
  };

  const handleSubmit = async () => {
    for (let i = 0; i < STEPS.length - 1; i++) {
      const err = validateStep(i);
      if (err) {
        setError(err);
        setStep(i);
        return;
      }
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await apiFetch('/api/reception/walk-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          cedula: form.cedula.trim().toUpperCase(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          membership_id: Number(form.membership_id),
          amount_usd: selectedPlan?.price_usd,
          method: form.method,
          reference: form.reference.trim() || null,
          check_in: form.check_in,
        }),
      });
      const data = await parseJsonResponse<WalkInSuccess & { error?: string }>(res);
      if (!res.ok) {
        setError(data?.error || 'No se pudo completar el registro');
        return;
      }
      setSuccess(data);
      onComplete?.();
    } catch {
      setError('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const copyPassword = async () => {
    if (!success?.temporary_password) return;
    try {
      await navigator.clipboard.writeText(success.temporary_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (success) {
    return (
      <Card padding="md" rounded="2xl" className="max-w-2xl page-stack">
        <div className="flex items-center gap-3 text-emerald-600">
          <CheckCircle className="h-8 w-8 shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Registro completado</h3>
            <p className="text-sm text-zinc-500">{success.user.full_name} ya puede usar el gym</p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-2 text-sm">
          <p><span className="text-zinc-500">Cédula:</span> <strong>{success.user.cedula}</strong></p>
          <p><span className="text-zinc-500">Email:</span> <strong>{success.user.email}</strong></p>
          <p><span className="text-zinc-500">Plan:</span> <strong>{success.membership_name}</strong></p>
          <p>
            <span className="text-zinc-500">Vigencia:</span>{' '}
            <strong>{success.subscription.startDate} → {success.subscription.endDate}</strong>
          </p>
          {success.checked_in && (
            <p className="text-emerald-600 font-bold flex items-center gap-2">
              <Fingerprint className="h-4 w-4" />
              Entrada autorizada hoy
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-orange-500/10 border border-orange-500/20 p-4">
          <p className="label-caps text-orange-600 mb-2">Contraseña temporal</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-lg font-mono font-bold text-zinc-900 dark:text-white break-all">
              {success.temporary_password}
            </code>
            <Button variant="secondary" size="sm" onClick={() => void copyPassword()}>
              <Copy className="h-4 w-4" />
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <p className="text-xs text-zinc-500 mt-2">Entréguela al cliente si más adelante usará la app.</p>
        </div>

        <Button className="w-full min-h-[48px]" onClick={resetWizard}>
          Registrar otra persona
        </Button>
      </Card>
    );
  }

  return (
    <Card padding="md" rounded="2xl" className="max-w-2xl page-stack">
      <div>
        <h3 className="section-title flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-orange-500" />
          Registro walk-in
        </h3>
        <p className="text-sm text-zinc-500 mt-1">
          Una sola operación: cuenta, membresía activa y pago aprobado.
        </p>
      </div>

      <div className="flex gap-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={cn(
              'flex-1 text-center py-2 rounded-xl text-xs font-semibold border transition-colors',
              i === step
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-600'
                : i < step
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <Label>Nombre completo</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Ej: Juan Pérez"
              className="min-h-[48px] text-base"
            />
          </div>
          <div>
            <Label>Cédula (obligatoria)</Label>
            <Input
              value={form.cedula}
              onChange={(e) => setForm({ ...form, cedula: e.target.value.toUpperCase() })}
              placeholder="V-12345678"
              className="min-h-[48px] text-base font-bold tracking-wider"
              autoComplete="off"
            />
          </div>
          <div>
            <Label>Correo electrónico</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="juan@ejemplo.com"
              className="min-h-[48px] text-base"
            />
          </div>
          <div>
            <Label>Teléfono (opcional)</Label>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="0414-0000000"
              className="min-h-[48px] text-base"
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          {loadingPlans ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : plans.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">No hay planes disponibles. Contacte al administrador.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setForm({ ...form, membership_id: String(plan.id) })}
                  className={cn(
                    'text-left p-4 rounded-2xl border transition-all min-h-[88px] touch-manipulation',
                    form.membership_id === String(plan.id)
                      ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/20'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-orange-500/40'
                  )}
                >
                  <p className="font-semibold text-zinc-900 dark:text-white">{plan.name}</p>
                  <p className="text-sm text-zinc-500 mt-1">{plan.duration_days} días</p>
                  <p className="text-lg font-bold text-orange-600 mt-2">${plan.price_usd}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <Label>Método de pago</Label>
            <Select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
              className="min-h-[48px] text-base w-full"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Referencia (opcional)</Label>
            <Input
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              placeholder="Nº de referencia o nota"
              className="min-h-[48px] text-base"
            />
          </div>
          <div className="rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 p-4">
            <p className="stat-label">Monto a cobrar</p>
            <p className="stat-value mt-1">
              ${selectedPlan?.price_usd ?? '—'} USD
            </p>
          </div>
          <label className="flex items-center gap-3 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 cursor-pointer touch-manipulation min-h-[48px]">
            <input
              type="checkbox"
              checked={form.check_in}
              onChange={(e) => setForm({ ...form, check_in: e.target.checked })}
              className="h-5 w-5 rounded accent-orange-500"
            />
            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              Autorizar entrada al gym al finalizar
            </span>
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3 text-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <p><span className="text-zinc-500">Nombre:</span> <strong>{form.full_name}</strong></p>
          <p><span className="text-zinc-500">Cédula:</span> <strong>{form.cedula}</strong></p>
          <p><span className="text-zinc-500">Email:</span> <strong>{form.email}</strong></p>
          {form.phone && <p><span className="text-zinc-500">Teléfono:</span> <strong>{form.phone}</strong></p>}
          <p><span className="text-zinc-500">Plan:</span> <strong>{selectedPlan?.name} — ${selectedPlan?.price_usd}</strong></p>
          <p><span className="text-zinc-500">Pago:</span> <strong>{PAYMENT_METHODS.find((m) => m.value === form.method)?.label}</strong></p>
          <p>
            <span className="text-zinc-500">Entrada hoy:</span>{' '}
            <strong className={form.check_in ? 'text-emerald-600' : 'text-zinc-500'}>
              {form.check_in ? 'Sí' : 'No'}
            </strong>
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {step > 0 && (
          <Button variant="secondary" className="min-h-[48px]" onClick={goBack} disabled={submitting}>
            <ChevronLeft className="h-5 w-5 mr-1" />
            Atrás
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button className="flex-1 min-h-[48px]" onClick={goNext}>
            Siguiente
            <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        ) : (
          <Button className="flex-1 min-h-[48px]" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? <Spinner className="h-5 w-5" /> : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Registrar y activar
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}
