import React, { useState, useEffect } from 'react';
import { apiFetch, parseJsonSafe } from '../lib/api';
import { useNavigate, Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { type UserRole } from '../lib/roles';
import { safeReturnPath } from '../lib/safeReturnPath';
import { Mail, ShieldCheck } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import AuthBrandHeader from '../components/AuthBrandHeader';
import AuthFormSurface from '../components/AuthFormSurface';
import { Button, Input, Label, PasswordInput, Alert } from '../components/ui';

interface LoginUser {
  id: number;
  email: string;
  role: UserRole;
  name: string;
}

interface LoginLocationState {
  from?: { pathname: string; search?: string } | string;
}

interface LoginApiResponse {
  user?: LoginUser;
  error?: string;
  locked_until?: number;
  retry_after_seconds?: number;
  mfa_required?: boolean;
  mfa_challenge_token?: string;
}

const EMAIL_STORAGE_KEY = 'gymapure:login-email';

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function resolveLockedUntil(data: LoginApiResponse): number | null {
  if (typeof data.locked_until === 'number' && data.locked_until > Date.now()) {
    return data.locked_until;
  }
  if (typeof data.retry_after_seconds === 'number' && data.retry_after_seconds > 0) {
    return Date.now() + data.retry_after_seconds * 1000;
  }
  return null;
}

export default function Login() {
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem(EMAIL_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [registerAllowed, setRegisterAllowed] = useState(true);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LoginLocationState | null)?.from;

  useEffect(() => {
    const sessionMessage = sessionStorage.getItem('auth:session-message');
    if (sessionMessage) {
      setError(sessionMessage);
      sessionStorage.removeItem('auth:session-message');
    }
  }, []);

  useEffect(() => {
    const run = () => {
      apiFetch('/api/auth/config')
        .then((res) => parseJsonSafe<{ allowPublicRegister?: boolean }>(res))
        .then((data) => setRegisterAllowed(data.allowPublicRegister !== false))
        .catch(() => setRegisterAllowed(true));
    };

    const idle = window.requestIdleCallback?.(run);
    if (idle !== undefined) {
      return () => window.cancelIdleCallback?.(idle);
    }

    const timer = globalThis.setTimeout(run, 0);
    return () => globalThis.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!lockedUntil || lockedUntil <= Date.now()) return;
    const id = globalThis.setInterval(() => setNow(Date.now()), 1000);
    return () => globalThis.clearInterval(id);
  }, [lockedUntil]);

  useEffect(() => {
    if (lockedUntil && lockedUntil <= now) {
      setLockedUntil(null);
      setError('');
    }
  }, [lockedUntil, now]);

  if (!isLoading && user) {
    return <Navigate to={safeReturnPath(from, user.role)} replace />;
  }

  const remainingSeconds =
    lockedUntil && lockedUntil > now ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0;
  const isLocked = remainingSeconds > 0;

  const rememberEmail = (value: string) => {
    try {
      localStorage.setItem(EMAIL_STORAGE_KEY, value.trim());
    } catch {
      /* ignore quota / private mode */
    }
  };

  const completeLogin = (loginUser: LoginUser) => {
    rememberEmail(email);
    login(loginUser);
    navigate(safeReturnPath(from, loginUser.role));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setError('');
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Email inválido';
    if (!password) next.password = 'La contraseña es obligatoria';
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await parseJsonSafe<LoginApiResponse>(res);

      if (!res.ok) {
        const until = resolveLockedUntil(data);
        if (until) {
          setLockedUntil(until);
          setNow(Date.now());
        }
        throw new Error(data.error || 'Error de inicio de sesión');
      }

      if (data.mfa_required && data.mfa_challenge_token) {
        rememberEmail(email);
        setMfaChallenge(data.mfa_challenge_token);
        setMfaCode('');
        setError('');
        return;
      }

      if (!data.user) {
        throw new Error('Respuesta de inicio de sesión inválida');
      }

      completeLogin(data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de inicio de sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaChallenge) return;
    setError('');
    const code = mfaCode.trim();
    if (!/^\d{6,8}$/.test(code)) {
      setError('Introduce el código de 6 dígitos de tu app');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/mfa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mfa_challenge_token: mfaChallenge,
          code,
          trust_device: trustDevice,
        }),
      });
      const data = await parseJsonSafe<{ user?: LoginUser; error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || 'Código MFA incorrecto');
      }
      if (!data.user) {
        throw new Error('Respuesta MFA inválida');
      }
      completeLogin(data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Código MFA incorrecto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell layout="split">
      <AuthFormSurface>
        <AuthBrandHeader
          subtitle={mfaChallenge ? 'Verificación en dos pasos' : 'Inicia sesión en tu cuenta'}
          formHint={
            mfaChallenge
              ? 'Introduce el código de tu app autenticadora'
              : 'Accede con tu cuenta del gimnasio'
          }
          splitAware
        />

        {mfaChallenge ? (
          <form className="form-stack mt-2 lg:mt-8" onSubmit={handleMfaSubmit} noValidate>
            {error && <Alert variant="error">{error}</Alert>}

            <div>
              <Label htmlFor="mfa_code">Código MFA</Label>
              <Input
                id="mfa_code"
                name="mfa_code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
                leadingIcon={<ShieldCheck />}
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-3 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
              <input
                type="checkbox"
                className="border-brand text-brand focus-visible:ring-brand mt-0.5 h-4 w-4 rounded focus-visible:ring-2"
                checked={trustDevice}
                onChange={(e) => setTrustDevice(e.target.checked)}
              />
              <span>
                Confiar en este dispositivo por 30 días
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                  No pediremos el código MFA en este navegador
                </span>
              </span>
            </label>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Verificar
            </Button>

            <button
              type="button"
              className="text-center text-xs font-semibold text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              onClick={() => {
                setMfaChallenge(null);
                setMfaCode('');
                setError('');
              }}
            >
              Volver al inicio de sesión
            </button>
          </form>
        ) : (
          <form className="form-stack mt-2 lg:mt-8" onSubmit={handleSubmit} noValidate>
            {isLocked ? (
              <Alert variant="error">
                <p>Demasiados intentos fallidos.</p>
                <p className="mt-1 font-semibold tabular-nums" aria-live="polite">
                  Podrás intentar de nuevo en {formatCountdown(remainingSeconds)}
                </p>
              </Alert>
            ) : (
              error && <Alert variant="error">{error}</Alert>
            )}

            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isLocked}
                leadingIcon={<Mail />}
                placeholder="correo@ejemplo.com"
                value={email}
                error={fieldErrors.email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                }}
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <Label htmlFor="password" className="mb-0">
                  Contraseña
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-brand hover:text-brand-hover text-xs font-semibold transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                required
                disabled={isLocked}
                placeholder="Tu contraseña"
                value={password}
                error={fieldErrors.password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                }}
              />
            </div>

            <Button
              type="submit"
              className="mt-1 w-full"
              size="lg"
              loading={loading}
              disabled={isLocked}
            >
              {isLocked ? `Espera ${formatCountdown(remainingSeconds)}` : 'Entrar'}
            </Button>

            {registerAllowed && (
              <div className="border-zinc-200/80 pt-1 text-center lg:mt-2 lg:border-t lg:pt-6 lg:text-left dark:border-zinc-800">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  ¿No tienes una cuenta?{' '}
                  <Link
                    to="/register"
                    className="text-brand hover:text-brand-hover font-semibold transition-colors"
                  >
                    Regístrate aquí
                  </Link>
                </p>
              </div>
            )}
          </form>
        )}
      </AuthFormSurface>
    </AuthShell>
  );
}
