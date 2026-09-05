import React, { useState, useEffect } from 'react';
import { apiFetch, parseJsonSafe } from '../lib/api';
import { useNavigate, Link, Navigate, useLocation, useSearchParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { type UserRole } from '../lib/roles';
import { safeReturnPath } from '../lib/safeReturnPath';
import { prefetchPostLogin } from '../lib/routePrefetch';
import AuthShell from '../components/AuthShell';
import AuthLinearHeader from '../components/AuthLinearHeader';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [registerAllowed, setRegisterAllowed] = useState(true);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const from = (location.state as LoginLocationState | null)?.from;

  useEffect(() => {
    const challenge = searchParams.get('mfa_challenge');
    if (challenge) {
      sessionStorage.setItem('auth:mfa-challenge', challenge);
      setSearchParams({}, { replace: true });
    }

    const storedChallenge = sessionStorage.getItem('auth:mfa-challenge');
    if (storedChallenge) {
      setMfaChallenge(storedChallenge);
      setMfaCode('');
      sessionStorage.removeItem('auth:mfa-challenge');
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const run = () => {
      apiFetch('/api/auth/config')
        .then((res) => parseJsonSafe<{ allowPublicRegister?: boolean }>(res))
        .then((data) => {
          setRegisterAllowed(data.allowPublicRegister !== false);
        })
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

  const completeLogin = (loginUser: LoginUser) => {
    const destination = safeReturnPath(from, loginUser.role);
    login(loginUser);
    prefetchPostLogin({ destination, role: loginUser.role, userId: loginUser.id });
    navigate(destination);
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
        body: JSON.stringify({ mfa_challenge_token: mfaChallenge, code }),
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
    <AuthShell aesthetic="linear">
      <div className="auth-linear-card" data-testid="login-panel">
        <AuthLinearHeader
          title={mfaChallenge ? 'Confirma que eres tú' : 'Entra'}
          subtitle={
            mfaChallenge
              ? 'El código de tu app autenticadora abre esta sesión.'
              : 'Tu cuenta del gym.'
          }
        />

        <div className="auth-form-wrap" key={mfaChallenge ? 'mfa' : 'login'}>
          {mfaChallenge ? (
            <form className="auth-form" onSubmit={handleMfaSubmit} noValidate>
              {error && <Alert variant="error">{error}</Alert>}

              <div>
                <Label className="auth-linear-label mb-1.5" htmlFor="mfa_code">
                  Código
                </Label>
                <Input
                  id="mfa_code"
                  name="mfa_code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  placeholder="000000"
                  className="auth-linear-field"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                />
              </div>

              <Button type="submit" className="auth-linear-primary mt-1 w-full" loading={loading}>
                Verificar
              </Button>

              <button
                type="button"
                className="text-left text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-200"
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
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
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
                <Label className="auth-linear-label mb-1.5" htmlFor="email">
                  Correo
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isLocked}
                  placeholder="correo@ejemplo.com"
                  className="auth-linear-field"
                  value={email}
                  error={fieldErrors.email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                  }}
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <Label className="auth-linear-label" htmlFor="password">
                    Contraseña
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="auth-linear-link text-xs font-medium"
                    aria-label="¿Olvidaste tu contraseña?"
                  >
                    ¿Olvidaste?
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  disabled={isLocked}
                  placeholder="Tu contraseña"
                  showIcon={false}
                  className="auth-linear-field"
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
                className="auth-linear-primary w-full"
                loading={loading}
                disabled={isLocked}
              >
                {isLocked ? `Espera ${formatCountdown(remainingSeconds)}` : 'Entrar'}
              </Button>

              {registerAllowed && (
                <p className="text-small pt-1 text-zinc-500">
                  ¿No tienes una cuenta?{' '}
                  <Link to="/register" className="auth-linear-link font-medium">
                    Regístrate
                  </Link>
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
