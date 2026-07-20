import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Copy,
  Fingerprint,
  Mail,
  AlertTriangle,
  LogOut,
  Upload,
} from 'lucide-react';
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
import { useExchangeRateQuery } from '../../hooks/queries/useExchangeRateQuery';

interface MembershipPlan {
  id: number;
  name: string;
  duration_days: number;
  price_usd: number;
}

interface WalkInSuccess {
  user: { id: number; full_name: string; email: string; cedula: string };
  membership_name: string;
  email_sent: boolean;
  password_setup_url?: string;
  checked_in: boolean;
  check_in_message?: string;
  subscription: { startDate: string; endDate: string };
}

interface ReceptionWalkInWizardProps {
  onComplete?: () => void;
  initialCedula?: string;
}

const STEPS = ['Datos', 'Plan', 'Pago', 'Confirmar'] as const;

const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'pago_movil', label: 'Pago móvil' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'zelle', label: 'Zelle' },
];

export default function ReceptionWalkInWizard({
  onComplete,
  initialCedula,
}: ReceptionWalkInWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<WalkInSuccess | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkedOut, setCheckedOut] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    full_name: '',
    cedula: initialCedula?.trim().toUpperCase() ?? '',
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
  const needsBsRate = form.method === 'pago_movil' || form.method === 'transferencia';
  const { data: exchangeRate } = useExchangeRateQuery(step === 2 && needsBsRate);
  const amountBs =
    needsBsRate && selectedPlan?.price_usd && exchangeRate
      ? (selectedPlan.price_usd * exchangeRate.rate).toFixed(2)
      : null;

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
    setCheckedOut(false);
    setCheckoutLoading(false);
    setCheckoutError('');
    setProofFile(null);
    setForm({
      full_name: '',
      cedula: initialCedula?.trim().toUpperCase() ?? '',
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
      const formData = new FormData();
      formData.append('full_name', form.full_name.trim());
      formData.append('cedula', form.cedula.trim().toUpperCase());
      formData.append('email', form.email.trim());
      if (form.phone.trim()) formData.append('phone', form.phone.trim());
      formData.append('membership_id', String(Number(form.membership_id)));
      if (selectedPlan?.price_usd) formData.append('amount_usd', String(selectedPlan.price_usd));
      formData.append('method', form.method);
      if (form.reference.trim()) formData.append('reference', form.reference.trim());
      formData.append('check_in', form.check_in ? 'true' : 'false');
      if (form.training_shift) formData.append('training_shift', form.training_shift);
      if (proofFile) formData.append('proof', proofFile);

      const res = await apiFetchWithRetry('/api/reception/walk-in', {
        method: 'POST',
        body: formData,
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

  const copySetupUrl = async () => {
    if (!success?.password_setup_url) return;
    try {
      await navigator.clipboard.writeText(success.password_setup_url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      // ignore
    }
  };

  const handleWalkInCheckout = async () => {
    if (!success?.user.cedula || checkedOut) return;
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const res = await apiFetch('/api/reception/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: success.user.cedula }),
      });
      const data = await parseJsonSafe<{ error?: string; success?: boolean }>(res);
      if (!res.ok || !data.success) {
        setCheckoutError(data.error || 'No se pudo registrar la salida');
        return;
      }
      setCheckedOut(true);
      onComplete?.();
    } catch {
      setCheckoutError('Error de red al registrar salida');
    } finally {
      setCheckoutLoading(false);
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
            <p
              className={cn(
                'flex items-center gap-2 font-bold',
                checkedOut ? 'text-zinc-500 dark:text-zinc-400' : 'text-emerald-600'
              )}
            >
              {checkedOut ? (
                <>
                  <LogOut className="h-4 w-4" />
                  Salida registrada
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4" />
                  Entrada autorizada hoy
                </>
              )}
            </p>
          )}
        </div>

        {success.email_sent ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="label-caps mb-2 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Mail className="h-4 w-4" />
              Correo enviado
            </p>
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              Se envió un correo a <strong>{success.user.email}</strong> con un enlace para crear su
              contraseña. Válido 48 horas.
            </p>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Indique al cliente que revise bandeja de entrada y spam.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                No se pudo enviar el correo. Copie el enlace de un solo uso y entréguelo al cliente
                (WhatsApp, QR o escrito). Válido 48 horas.
              </p>
            </div>
            {success.password_setup_url && (
              <div className="bg-brand/10 border-brand/20 rounded-2xl border p-4">
                <p className="label-caps text-brand mb-2">Enlace para crear contraseña</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-xs font-semibold break-all text-zinc-900 dark:text-white">
                    {success.password_setup_url}
                  </code>
                  <Button variant="secondary" size="sm" onClick={() => void copySetupUrl()}>
                    <Copy className="h-4 w-4" />
                    {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  El cliente abre el enlace y elige su contraseña. No comparta contraseñas en claro.
                </p>
              </div>
            )}
          </>
        )}

        {success.checked_in && !checkedOut && (
          <Button
            variant="secondary"
            className="min-h-11 w-full"
            onClick={() => void handleWalkInCheckout()}
            loading={checkoutLoading}
          >
            <LogOut className="mr-2 h-5 w-5" />
            Registrar salida ahora
          </Button>
        )}
        {checkoutError && <p className="text-sm text-red-600 dark:text-red-400">{checkoutError}</p>}

        <Button className="min-h-11 w-full" onClick={resetWizard}>
          Registrar otra persona
        </Button>
      </Card>
    );
  }

  return (
    <div className="page-stack max-w-2xl rounded-xl border border-zinc-200/70 bg-white/80 p-3 sm:p-4 dark:border-zinc-800/80 dark:bg-zinc-900/50">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
          <UserPlus className="text-brand h-4 w-4" />
          Registro en mostrador
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Cuenta + plan + pago.{' '}
          <Link to="/members" className="text-brand font-medium hover:underline">
            Solo cuenta →
          </Link>
        </p>
      </div>

      <div
        className="flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Pasos del registro"
      >
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={i === step}
            disabled={i > step}
            onClick={() => {
              if (i < step) {
                setError('');
                setStep(i);
              }
            }}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
              i === step
                ? 'border-brand/40 bg-brand/10 text-brand'
                : i < step
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600'
                  : 'border-zinc-200/80 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500'
            )}
          >
            <span className="tabular-nums opacity-70">{i + 1}</span>
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600">
          {error}
        </div>
      )}

      {step === 0 && (
        <div className="space-y-3">
          <div>
            <Label>Nombre completo</Label>
            <Input
              value={form.full_name}
              onChange={(e) => {
                setForm({ ...form, full_name: e.target.value });
              }}
              placeholder="Ej: Juan Pérez"
              className="min-h-11 text-base"
            />
          </div>
          <div>
            <Label>Cédula</Label>
            <CedulaInput
              value={form.cedula}
              onChange={(value) => {
                setForm({ ...form, cedula: value });
              }}
              className="min-h-11 text-base font-semibold tracking-wider"
            />
          </div>
          <div>
            <Label>Correo</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
              }}
              placeholder="juan@ejemplo.com"
              className="min-h-11 text-base"
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
              className="min-h-11 text-base"
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
                    'min-h-[4.5rem] touch-manipulation rounded-xl border p-3 text-left transition-all',
                    form.membership_id === String(plan.id)
                      ? 'border-brand/40 bg-brand/10'
                      : 'hover:border-brand/30 border-zinc-200/80 dark:border-zinc-800'
                  )}
                >
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">{plan.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {plan.duration_days} días
                  </p>
                  <p className="text-brand mt-1 text-base font-bold">${plan.price_usd}</p>
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
              className="min-h-11 w-full text-base"
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
              className="min-h-11 text-base"
            />
          </div>
          <div>
            <Label>Comprobante (opcional)</Label>
            <div className="flex w-full items-center justify-center">
              <label className="hover:bg-brand/5 hover:border-brand/50 group flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 transition-all dark:border-zinc-700 dark:bg-zinc-800/10">
                <Upload className="group-hover:text-brand mb-2 h-7 w-7 text-zinc-400 transition-colors dark:text-zinc-300" />
                <p className="group-hover:text-brand text-xs font-medium text-zinc-500 transition-colors dark:text-zinc-400">
                  Adjuntar captura de pago
                </p>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            {proofFile && (
              <p className="mt-2 text-center text-xs font-medium text-emerald-600 dark:text-emerald-500">
                Seleccionado: {proofFile.name}
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-800/50">
            <p className="stat-label">Monto a cobrar</p>
            <p className="stat-value mt-1">${selectedPlan?.price_usd ?? '—'} USD</p>
            {needsBsRate && amountBs && exchangeRate && (
              <p className="mt-2 text-sm font-semibold text-zinc-700 tabular-nums dark:text-zinc-300">
                ≈ {Number(amountBs).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                <span className="ml-1 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  (tasa BCV {exchangeRate.effective_date})
                </span>
              </p>
            )}
          </div>
          <label className="flex min-h-11 cursor-pointer touch-manipulation items-center gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
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
          <Button variant="secondary" className="min-h-11" onClick={goBack} disabled={submitting}>
            <ChevronLeft className="mr-1 h-5 w-5" />
            Atrás
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button className="min-h-11 flex-1" onClick={goNext}>
            Siguiente
            <ChevronRight className="ml-1 h-5 w-5" />
          </Button>
        ) : (
          <Button
            className="min-h-11 flex-1"
            onClick={() => void handleSubmit()}
            loading={submitting}
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Registrar y activar
          </Button>
        )}
      </div>
    </div>
  );
}
