import React, { useState } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, CreditCard, Phone } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import AuthBrandHeader from '../components/AuthBrandHeader';
import { Button, Card, Input, Label, PasswordInput, passwordStrength, Spinner } from '../components/ui';
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

      const data = await parseJsonResponse<{ user: Parameters<typeof login>[0]; message?: string }>(res);
      login(data.user);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      backLink={{ to: '/login', label: 'Volver al login' }}
      footer={
        <p className="text-center text-xs text-zinc-500">
          ¿Vienes al gym?{' '}
          <Link to="/check-in" className="font-semibold text-orange-600 hover:text-orange-500">
            Registro de entrada
          </Link>
        </p>
      }
    >
      <Card className="w-full space-y-6 shadow-xl mt-10 rounded-2xl" padding="lg">
        <AuthBrandHeader subtitle="Crea tu cuenta de miembro" />

      <ol className="flex items-center gap-1 text-xs font-semibold mb-6" role="list" aria-label="Pasos del registro">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2 flex-1 last:flex-none" role="listitem">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  i < step
                    ? 'bg-emerald-500 text-white'
                    : i === step
                      ? 'bg-orange-500 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                )}
                aria-hidden
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span
                className={cn(
                  'hidden sm:inline truncate',
                  i === step ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-500'
                )}
                aria-current={i === step ? 'step' : undefined}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'hidden sm:block flex-1 h-px mx-1',
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
          className="space-y-4"
          onSubmit={step === 1 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}
        >
          {error && (
            <div
              role="alert"
              className="rounded-xl bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-500 border border-red-500/20"
            >
              {error}
            </div>
          )}

          {step === 0 ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name">Nombre completo</Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 z-10">
                    <User className="h-5 w-5 text-zinc-400" />
                  </div>
                  <Input
                    id="full_name"
                    type="text"
                    required
                    autoComplete="name"
                    className="pl-10"
                    placeholder="Juan Pérez"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 z-10">
                    <Mail className="h-5 w-5 text-zinc-400" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="pl-10"
                    placeholder="correo@ejemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cedula">Cédula</Label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 z-10">
                      <CreditCard className="h-5 w-5 text-zinc-400" />
                    </div>
                    <Input
                      id="cedula"
                      type="text"
                      required
                      autoComplete="off"
                      className="pl-10"
                      placeholder="V-12345678"
                      value={formData.cedula}
                      onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">Formato: V-12345678</p>
                </div>
                <div>
                  <Label htmlFor="phone">
                    Teléfono <span className="normal-case tracking-normal font-medium text-zinc-400">(opcional)</span>
                  </Label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 z-10">
                      <Phone className="h-5 w-5 text-zinc-400" />
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      className="pl-10"
                      placeholder="+58 412…"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg">
                Continuar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
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
                    <div className="flex gap-1" role="progressbar" aria-valuenow={strength.score} aria-valuemin={0} aria-valuemax={3}>
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
                  onClick={() => { setStep(0); setError(''); }}
                >
                  Atrás
                </Button>
                <Button type="submit" disabled={loading} className="flex-1" size="lg">
                  {loading ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Registrando…
                    </>
                  ) : (
                    'Crear cuenta'
                  )}
                </Button>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-zinc-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold text-orange-600 hover:text-orange-500">
              Inicia sesión
            </Link>
          </p>
        </form>
      </Card>
    </AuthShell>
  );
}
