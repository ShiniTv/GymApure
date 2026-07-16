import React, { useState } from 'react';
import { apiFetch, parseJsonSafe, connectionOrApiError } from '../lib/api';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { APP_HOME } from '../lib/roles';
import { User, Mail, CreditCard, Phone } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import AuthBrandHeader from '../components/AuthBrandHeader';
import {
  Button,
  Card,
  Input,
  Label,
  PasswordInput,
  passwordStrength,
  CedulaInput,
  Alert,
} from '../components/ui';
import { cn } from '../lib/utils';
import { passwordSchema } from '../lib/passwordPolicy';

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
    if (!formData.cedula.trim())
      next.cedula = 'La cédula es obligatoria para el check-in en el gym';
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
    <AuthShell backLink={{ to: '/login', label: 'Volver al login' }}>
      <Card className="page-stack mt-8 w-full rounded-2xl shadow-xl sm:mt-10" padding="md">
        <AuthBrandHeader subtitle="Crea tu cuenta de miembro" />

        <ol
          className="mb-6 flex items-center gap-1 text-xs font-semibold"
          aria-label="Pasos del registro"
        >
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  i < step
                    ? 'bg-emerald-500 text-white'
                    : i === step
                      ? 'brand-solid'
                      : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-300'
                )}
                aria-hidden
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span
                className={cn(
                  'hidden truncate sm:inline',
                  i === step ? 'text-brand dark:text-brand' : 'text-zinc-500'
                )}
                aria-current={i === step ? 'step' : undefined}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'mx-1 hidden h-px flex-1 sm:block',
                    i < step ? 'bg-emerald-500/50' : 'bg-zinc-200 dark:bg-zinc-700'
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

        <form
          className="form-stack"
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
            <div className="form-stack">
              <div>
                <Label htmlFor="full_name">Nombre completo</Label>
                <Input
                  id="full_name"
                  type="text"
                  required
                  autoComplete="name"
                  leadingIcon={<User />}
                  placeholder="Juan Pérez"
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
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  leadingIcon={<Mail />}
                  placeholder="correo@ejemplo.com"
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
                  <Label htmlFor="cedula">Cédula</Label>
                  <CedulaInput
                    id="cedula"
                    required
                    leadingIcon={<CreditCard />}
                    value={formData.cedula}
                    error={fieldErrors.cedula}
                    onChange={(value) => {
                      setFormData({ ...formData, cedula: value });
                      if (fieldErrors.cedula) setFieldErrors((prev) => ({ ...prev, cedula: '' }));
                    }}
                  />
                  <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-300">
                    Formato: V-12345678 · Para identificarte en recepción
                  </p>
                </div>
                <div>
                  <Label htmlFor="phone">
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
                    leadingIcon={<Phone />}
                    placeholder="+58 412…"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg">
                Continuar
              </Button>
            </div>
          ) : (
            <div className="form-stack">
              <div>
                <Label htmlFor="password">Contraseña</Label>
                <PasswordInput
                  id="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Ej: Gym2024!"
                  value={formData.password}
                  error={fieldErrors.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                  }}
                />
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
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
                    <p className="text-xs font-medium text-zinc-500">Fortaleza: {strength.label}</p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="confirm_password">Confirmar contraseña</Label>
                <PasswordInput
                  id="confirm_password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Repite tu contraseña"
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
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setStep(0);
                    setError('');
                  }}
                >
                  Atrás
                </Button>
                <Button type="submit" loading={loading} className="flex-1" size="lg">
                  Crear cuenta
                </Button>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-zinc-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-brand hover:text-brand font-semibold">
              Inicia sesión
            </Link>
          </p>
        </form>
      </Card>
    </AuthShell>
  );
}
