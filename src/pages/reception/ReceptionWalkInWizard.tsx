import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, ChevronRight, ChevronLeft, CheckCircle, Copy, Fingerprint } from 'lucide-react';
import {
  apiFetch,
  apiFetchWithRetry,
  parseJsonResponse,
  parseJsonSafe,
  toDisplayErrorMessage,
} from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input, Label, Select, Spinner, CedulaInput } from '../../components/ui';
import { cn } from '../../lib/utils';
import { ShiftFilter } from '../../components/trainers/ShiftFilter';

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
  const { user } = useAuth();
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
    training_shift: '' as '' | 'diurno' | 'vespertino' | 'nocturno',
  });

  useEffect(() => {
    apiFetch('/api/memberships')
      .then((res) => parseJsonResponse<MembershipPlan[]>(res))
      .then((data) => {
        setPlans(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setPlans([]);
      })
      .finally(() => {
        setLoadingPlans(false);
      });
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((p) => String(p.id) === form.membership_id),
    [plans, form.membership_id]
  );

  const validateStep = (index: number): string | null => {
    if (index === 0) {
      if (!form.full_name.trim() || form.full_name.trim().length < 3)
        return 'Nombre completo requerido (mín. 3 caracteres)';
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
      training_shift: '',
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
      const res = await apiFetchWithRetry('/api/reception/walk-in', {
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
          training_shift: form.training_shift || null,
        }),
        timeout: 30_000,
        retries: 2,
      });
      const data = await parseJsonSafe<WalkInSuccess & { error?: string }>(res);
      if (!res.ok) {
        setError(data.error || `No se pudo completar el registro (${res.status})`);
        return;
      }
      setSuccess(data);
      onComplete?.();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('La solicitud tardó demasiado. Revise la conexión e intente de nuevo.');
      } else {
        setError(toDisplayErrorMessage(err, 'Sin conexión. Revise la red e intente de nuevo.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyPassword = async () => {
    if (!success?.temporary_password) return;
    try {
      await navigator.clipboard.writeText(success.temporary_password);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      // ignore
    }
  };

  if (success) {
    return (
      <Card padding="md" rounded="2xl" className="page-stack max-w-2xl">
        <div className="flex items-center gap-3 text-emerald-600">
          <CheckCircle className="h-8 w-8 shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Registro completado</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {success.user.full_name} ya puede usar el gym
            </p>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <p>
            <span className="text-zinc-500 dark:text-zinc-400">Cédula:</span>{' '}
            <strong>{success.user.cedula}</strong>
          </p>
          <p>
            <span className="text-zinc-500 dark:text-zinc-400">Email:</span>{' '}
            <strong>{success.user.email}</strong>
          </p>
          <p>
            <span className="text-zinc-500 dark:text-zinc-400">Plan:</span>{' '}
            <strong>{success.membership_name}</strong>
          </p>
          <p>
            <span className="text-zinc-500 dark:text-zinc-400">Vigencia:</span>{' '}
            <strong>
              {success.subscription.startDate} → {success.subscription.endDate}
            </strong>
          </p>
          {success.checked_in && (
            <p className="flex items-center gap-2 font-bold text-emerald-600">
              <Fingerprint className="h-4 w-4" />
              Entrada autorizada hoy
            </p>
          )}
        </div>

        <div className="bg-brand/10 border-brand/20 rounded-2xl border p-4">
          <p className="label-caps text-brand mb-2">Contraseña temporal</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-lg font-bold break-all text-zinc-900 dark:text-white">
              {success.temporary_password}
            </code>
            <Button variant="secondary" size="sm" onClick={() => void copyPassword()}>
              <Copy className="h-4 w-4" />
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Entréguela al cliente si más adelante usará la app.
          </p>
        </div>

        <Button className="min-h-[48px] w-full" onClick={resetWizard}>
          Registrar otra persona
        </Button>
      </Card>
    );
  }

  return (
    <Card padding="md" rounded="2xl" className="page-stack max-w-2xl">
      <div>
        <h3 className="section-title flex items-center gap-2">
          <UserPlus className="text-brand h-4 w-4" />
          Registro walk-in
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Una sola operación: cuenta, membresía activa y pago aprobado.
        </p>
        <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
          Use esto cuando el cliente{' '}
          <strong className="font-semibold text-zinc-800 dark:text-zinc-200">
            paga hoy en el mostrador
          </strong>{' '}
          (efectivo, pago móvil, etc.) y quiere entrar al gym.{' '}
          <Link to="/members" className="text-brand font-semibold hover:underline">
            ¿Solo crear cuenta sin pago? Ir a Miembros →
          </Link>
        </div>
      </div>

      <div className="flex gap-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={cn(
              'flex-1 rounded-xl border py-2 text-center text-xs font-semibold transition-colors',
              i === step
                ? 'bg-brand/10 border-brand/30 text-brand'
                : i < step
                  ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600'
                  : 'border-zinc-200 text-zinc-400 dark:border-zinc-800 dark:text-zinc-300'
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <Label>Nombre completo</Label>
            <Input
              value={form.full_name}
              onChange={(e) => {
                setForm({ ...form, full_name: e.target.value });
              }}
              placeholder="Ej: Juan Pérez"
              className="min-h-[48px] text-base"
            />
          </div>
          <div>
            <Label>Cédula (obligatoria)</Label>
            <CedulaInput
              value={form.cedula}
              onChange={(value) => {
                setForm({ ...form, cedula: value });
              }}
              className="min-h-[48px] text-base font-bold tracking-wider"
            />
          </div>
          <div>
            <Label>Correo electrónico</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
              }}
              placeholder="juan@ejemplo.com"
              className="min-h-[48px] text-base"
            />
          </div>
          <div>
            <Label>Teléfono (opcional)</Label>
            <Input
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => {
                setForm({ ...form, phone: e.target.value });
              }}
              placeholder="0414-0000000"
              className="min-h-[48px] text-base"
            />
          </div>
          <div>
            <Label>Turno de entrenamiento</Label>
            <ShiftFilter
              includeAll={false}
              label=""
              value={form.training_shift}
              onChange={(shift) => {
                setForm({ ...form, training_shift: shift });
              }}
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          {loadingPlans ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : plans.length === 0 ? (
            <div className="space-y-3 py-8 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No hay planes de membresía disponibles. El administrador debe crear al menos un
                plan.
              </p>
              {user?.role === 'admin' ? (
                <Link to="/memberships">
                  <Button size="sm" variant="secondary">
                    Crear plan de membresía
                  </Button>
                </Link>
              ) : (
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  Pide al administrador que configure los planes en Membresías.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => {
                    setForm({ ...form, membership_id: String(plan.id) });
                  }}
                  className={cn(
                    'min-h-[88px] touch-manipulation rounded-2xl border p-4 text-left transition-all',
                    form.membership_id === String(plan.id)
                      ? 'border-brand bg-brand/10 ring-brand/20 ring-2'
                      : 'hover:border-brand/40 border-zinc-200 dark:border-zinc-800'
                  )}
                >
                  <p className="font-semibold text-zinc-900 dark:text-white">{plan.name}</p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {plan.duration_days} días
                  </p>
                  <p className="text-brand mt-2 text-lg font-bold">${plan.price_usd}</p>
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
              onChange={(e) => {
                setForm({ ...form, method: e.target.value });
              }}
              className="min-h-[48px] w-full text-base"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Referencia (opcional)</Label>
            <Input
              value={form.reference}
              onChange={(e) => {
                setForm({ ...form, reference: e.target.value });
              }}
              placeholder="Nº de referencia o nota"
              className="min-h-[48px] text-base"
            />
          </div>
          <div className="rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-800/50">
            <p className="stat-label">Monto a cobrar</p>
            <p className="stat-value mt-1">${selectedPlan?.price_usd ?? '—'} USD</p>
          </div>
          <label className="flex min-h-[48px] cursor-pointer touch-manipulation items-center gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <input
              type="checkbox"
              checked={form.check_in}
              onChange={(e) => {
                setForm({ ...form, check_in: e.target.checked });
              }}
              className="accent-brand h-5 w-5 rounded"
            />
            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              Autorizar entrada al gym al finalizar
            </span>
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3 rounded-2xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <p>
            <span className="text-zinc-500 dark:text-zinc-400">Nombre:</span>{' '}
            <strong>{form.full_name}</strong>
          </p>
          <p>
            <span className="text-zinc-500 dark:text-zinc-400">Cédula:</span>{' '}
            <strong>{form.cedula}</strong>
          </p>
          <p>
            <span className="text-zinc-500 dark:text-zinc-400">Email:</span>{' '}
            <strong>{form.email}</strong>
          </p>
          {form.phone && (
            <p>
              <span className="text-zinc-500 dark:text-zinc-400">Teléfono:</span>{' '}
              <strong>{form.phone}</strong>
            </p>
          )}
          <p>
            <span className="text-zinc-500 dark:text-zinc-400">Plan:</span>{' '}
            <strong>
              {selectedPlan?.name} — ${selectedPlan?.price_usd}
            </strong>
          </p>
          <p>
            <span className="text-zinc-500 dark:text-zinc-400">Pago:</span>{' '}
            <strong>{PAYMENT_METHODS.find((m) => m.value === form.method)?.label}</strong>
          </p>
          <p>
            <span className="text-zinc-500 dark:text-zinc-400">Entrada hoy:</span>{' '}
            <strong
              className={form.check_in ? 'text-emerald-600' : 'text-zinc-500 dark:text-zinc-400'}
            >
              {form.check_in ? 'Sí' : 'No'}
            </strong>
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {step > 0 && (
          <Button
            variant="secondary"
            className="min-h-[48px]"
            onClick={goBack}
            disabled={submitting}
          >
            <ChevronLeft className="mr-1 h-5 w-5" />
            Atrás
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button className="min-h-[48px] flex-1" onClick={goNext}>
            Siguiente
            <ChevronRight className="ml-1 h-5 w-5" />
          </Button>
        ) : (
          <Button
            className="min-h-[48px] flex-1"
            onClick={() => void handleSubmit()}
            loading={submitting}
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Registrar y activar
          </Button>
        )}
      </div>
    </Card>
  );
}
