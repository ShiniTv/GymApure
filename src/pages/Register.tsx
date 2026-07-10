import React, { useState } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
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
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const strength = passwordStrength(formData.password);

  const validateStep1 = () => {
    if (!formData.full_name.trim()) {
      setError('El nombre es obligatorio');
      return false;
    }
    if (!formData.email.trim()) {
      setError('El correo es obligatorio');
      return false;
    }
    if (!formData.cedula.trim()) {
      setError('La cédula es obligatoria para el check-in en el gym');
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
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

      const data = await parseJsonResponse<{ user: Parameters<typeof login>[0]; message?: string }>(
        res
      );
      login(data.user);
      void navigate(APP_HOME);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el registro');
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
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-500"
            >
              {error}
            </div>
          )}

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
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    onChange={(value) => setFormData({ ...formData, cedula: value })}
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
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
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
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
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
