import React, { useState } from 'react';
import { apiFetch, parseJsonSafe, connectionOrApiError } from '../lib/api';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { APP_HOME } from '../lib/roles';
import AuthShell from '../components/AuthShell';
import AuthLinearHeader from '../components/AuthLinearHeader';
import { ArrowRight } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  PasswordInput,
  passwordStrength,
  CedulaInput,
  Alert,
} from '../components/ui';
import { cn } from '../lib/utils';

const STEPS = ['Datos personales', 'Credenciales'] as const;

export default function Register() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    cedula: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const strength = passwordStrength(formData.password);

  const validateStep1 = () => {
    const next: Record<string, string> = {};
    if (!formData.full_name.trim()) next.full_name = 'El nombre es obligatorio';
    if (!formData.email.trim()) next.email = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()))
      next.email = 'Email inválido';
    if (!formData.cedula.trim()) next.cedula = 'La cédula es obligatoria para el acceso al gym';
    setFieldErrors(next);
    setError(Object.values(next)[0] || '');
    return Object.keys(next).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const next: Record<string, string> = {};
    const { passwordSchema } = await import('../lib/passwordSchema');
    const passwordResult = passwordSchema.safeParse(formData.password);
    if (!passwordResult.success) {
      next.password = passwordResult.error.issues[0]?.message || 'Contraseña inválida';
    }
    if (formData.password !== formData.confirm_password) {
      next.confirm_password = 'Las contraseñas no coinciden';
    }
    setFieldErrors(next);
    if (Object.keys(next).length > 0) {
      setError(Object.values(next)[0] || '');
      return;
    }

    setLoading(true);

    try {
      const { confirm_password: _, ...payload } = formData;
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await parseJsonSafe<{
        user: Parameters<typeof login>[0];
        message?: string;
        error?: string;
      }>(res);
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo completar el registro');
      }
      if (!data.user) {
        throw new Error('Respuesta de registro inválida');
      }
      login(data.user);
      void navigate(APP_HOME);
    } catch (err: unknown) {
      setError(connectionOrApiError(err, 'No se pudo completar el registro'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell aesthetic="linear">
      <div className="auth-linear-card">
        <AuthLinearHeader subtitle="Crea tu cuenta" />

        <ol
          className="mb-6 flex items-center justify-center gap-3 text-xs font-semibold"
          aria-label="Pasos del registro"
        >
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-200',
                  i < step
                    ? 'bg-white text-zinc-950 shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                    : i === step
                      ? 'border border-white/30 bg-white/15 text-white shadow-[0_0_12px_color-mix(in_srgb,var(--color-brand)_40%,transparent)]'
                      : 'border border-white/10 bg-white/[0.04] text-zinc-500'
                )}
                aria-hidden
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs transition-colors',
                  i === step ? 'font-semibold text-zinc-100' : 'font-medium text-zinc-500'
                )}
                aria-current={i === step ? 'step' : undefined}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'mx-1 h-px w-8 transition-colors sm:w-12',
                    i < step ? 'bg-white/40' : 'bg-white/10'
                  )}
                  aria-hidden
                />
              )}
              <span className="sr-only">
                Paso {i + 1} de {STEPS.length}: {label}
                {i === step ? ' (actual)' : ''}
              </span>
            </li>
          ))}
        </ol>

        <div className="auth-form-wrap" key={step}>
          <form
            className="auth-form"
            onSubmit={
              step === 1
                ? handleSubmit
                : (e) => {
                    e.preventDefault();
                    handleNext();
                  }
            }
          >
            {error && <Alert variant="error">{error}</Alert>}

            {step === 0 ? (
              <div className="auth-form">
                <div>
                  <Label className="auth-linear-label" htmlFor="full_name">
                    Nombre completo
                  </Label>
                  <Input
                    id="full_name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Juan Pérez"
                    className="auth-linear-field"
                    value={formData.full_name}
                    error={fieldErrors.full_name}
                    onChange={(e) => {
                      setFormData({ ...formData, full_name: e.target.value });
                      if (fieldErrors.full_name)
                        setFieldErrors((prev) => ({ ...prev, full_name: '' }));
                    }}
                  />
                </div>

                <div>
                  <Label className="auth-linear-label" htmlFor="email">
                    Correo electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="correo@ejemplo.com"
                    className="auth-linear-field"
                    value={formData.email}
                    error={fieldErrors.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="auth-linear-label" htmlFor="cedula">
                      Cédula
                    </Label>
                    <CedulaInput
                      id="cedula"
                      required
                      value={formData.cedula}
                      error={fieldErrors.cedula}
                      className="auth-linear-field"
                      onChange={(value) => {
                        setFormData({ ...formData, cedula: value });
                        if (fieldErrors.cedula) setFieldErrors((prev) => ({ ...prev, cedula: '' }));
                      }}
                    />
                    <p className="text-text-muted text-small mt-1">
                      Formato: V-12345678 · Para identificarte en recepción
                    </p>
                  </div>
                  <div>
                    <Label className="auth-linear-label" htmlFor="phone">
                      Teléfono{' '}
                      <span className="font-medium tracking-normal text-zinc-400 normal-case">
                        (opcional)
                      </span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+58 412…"
                      className="auth-linear-field"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="auth-linear-primary group relative mt-2 flex w-full items-center justify-center gap-2"
                  size="lg"
                >
                  <span>Continuar</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10 transition-transform duration-200 group-hover:translate-x-0.5">
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </Button>
              </div>
            ) : (
              <div className="auth-form">
                <div>
                  <Label className="auth-linear-label" htmlFor="password">
                    Contraseña
                  </Label>
                  <PasswordInput
                    id="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Ej: Gym2024!"
                    showIcon={false}
                    className="auth-linear-field"
                    value={formData.password}
                    error={fieldErrors.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (fieldErrors.password)
                        setFieldErrors((prev) => ({ ...prev, password: '' }));
                    }}
                  />
                  <p className="text-text-muted text-small mt-1">
                    Mín. 8 caracteres, con mayúscula, minúscula, número y carácter especial.
                  </p>
                  {formData.password && (
                    <div className="mt-2 space-y-1">
                      <div
                        className="flex gap-1"
                        role="progressbar"
                        aria-valuenow={strength.score}
                        aria-valuemin={0}
                        aria-valuemax={3}
                      >
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={cn(
                              'h-1 flex-1 rounded-full transition-colors',
                              strength.score >= level
                                ? level === 1
                                  ? 'bg-red-500'
                                  : level === 2
                                    ? 'bg-yellow-500'
                                    : 'bg-emerald-500'
                                : 'bg-zinc-200 dark:bg-zinc-700'
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-xs font-medium text-zinc-500">
                        Fortaleza: {strength.label}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="auth-linear-label" htmlFor="confirm_password">
                    Confirmar contraseña
                  </Label>
                  <PasswordInput
                    id="confirm_password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Repite tu contraseña"
                    showIcon={false}
                    className="auth-linear-field"
                    value={formData.confirm_password}
                    error={fieldErrors.confirm_password}
                    onChange={(e) => {
                      setFormData({ ...formData, confirm_password: e.target.value });
                      if (fieldErrors.confirm_password)
                        setFieldErrors((prev) => ({ ...prev, confirm_password: '' }));
                    }}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="auth-linear-secondary flex-1"
                    size="lg"
                    onClick={() => {
                      setStep(0);
                      setError('');
                    }}
                  >
                    Atrás
                  </Button>
                  <Button
                    type="submit"
                    loading={loading}
                    className="auth-linear-primary group relative flex flex-1 items-center justify-center gap-2"
                    size="lg"
                  >
                    <span>{loading ? 'Creando cuenta...' : 'Crear cuenta'}</span>
                    {!loading && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10 transition-transform duration-200 group-hover:translate-x-0.5">
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            )}

            <p className="text-center text-xs text-zinc-400">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="auth-linear-link font-medium transition-colors">
                Inicia sesión
              </Link>
            </p>
          </form>
        </div>
      </div>
    </AuthShell>
  );
}
