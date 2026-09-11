import React, { useState, useEffect, useRef } from 'react';
import { apiFetch, parseJsonSafe } from '../lib/api';
import { useNavigate, Link, Navigate, useLocation, useSearchParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { type UserRole } from '../lib/roles';
import { safeReturnPath } from '../lib/safeReturnPath';
import { prefetchPostLogin } from '../lib/routePrefetch';
import { hapticSuccess, hapticError, hapticLight } from '../lib/haptics';
import { Mail, ShieldCheck, KeyRound, Clock } from 'lucide-react';
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
  const [rememberEmail, setRememberEmail] = useState(() => {
    try {
      return localStorage.getItem('auth:remember-email') === 'true';
    } catch {
      return false;
    }
  });

  const [email, setEmail] = useState(() => {
    try {
      const shouldRemember = localStorage.getItem('auth:remember-email') === 'true';
      return shouldRemember ? (localStorage.getItem('auth:saved-email') ?? '') : '';
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
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const mfaInputRef = useRef<HTMLInputElement>(null);
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

    if ('requestIdleCallback' in window) {
      const idle = window.requestIdleCallback(run);
      return () => window.cancelIdleCallback(idle);
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

  const persistEmailPreference = (currentEmail: string) => {
    try {
      if (rememberEmail) {
        localStorage.setItem('auth:remember-email', 'true');
        localStorage.setItem('auth:saved-email', currentEmail.trim());
      } else {
        localStorage.removeItem('auth:remember-email');
        localStorage.removeItem('auth:saved-email');
      }
    } catch {
      // ignore storage errors
    }
  };

  const completeLogin = (loginUser: LoginUser) => {
    persistEmailPreference(email);
    hapticSuccess();
    const destination = safeReturnPath(from, loginUser.role);
    login(loginUser);
    void prefetchPostLogin({ destination, role: loginUser.role, userId: loginUser.id });
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
    if (Object.keys(next).length > 0) {
      hapticError();
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await parseJsonSafe<LoginApiResponse>(res);

      if (!res.ok) {
        const until = resolveLockedUntil(data);
        if (until) {
          setLockedUntil(until);
          setNow(Date.now());
        }
        hapticError();
        throw new Error(data.error ?? 'Error de inicio de sesión');
      }

      if (data.mfa_required && data.mfa_challenge_token) {
        hapticLight();
        setMfaChallenge(data.mfa_challenge_token);
        setMfaCode('');
        setError('');
        return;
      }

      if (!data.user) {
        hapticError();
        throw new Error('Respuesta de inicio de sesión inválida');
      }

      completeLogin(data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de inicio de sesión');
    } finally {
      setLoading(false);
    }
  };

  const verifyMfaCode = async (codeToVerify: string) => {
    if (!mfaChallenge || loading) return;
    setError('');
    const code = codeToVerify.trim();
    if (!/^\d{6,8}$/.test(code)) {
      hapticError();
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
        hapticError();
        throw new Error(data.error ?? 'Código MFA incorrecto');
      }
      if (!data.user) {
        hapticError();
        throw new Error('Respuesta MFA inválida');
      }
      completeLogin(data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Código MFA incorrecto');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyMfaCode(mfaCode);
  };

  const handleMfaChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 8);
    setMfaCode(clean);
    if (error) setError('');
    if (clean.length === 6) {
      void verifyMfaCode(clean);
    }
  };

  return (
    <AuthShell aesthetic="linear">
      <div className="auth-linear-card" data-testid="login-panel">
        <AuthLinearHeader
          subtitle={mfaChallenge ? 'Verificación en dos pasos' : 'Inicia sesión en tu cuenta'}
        />

        <div className="auth-form-wrap" key={mfaChallenge ? 'mfa' : 'login'}>
          {mfaChallenge ? (
            <form className="auth-form" onSubmit={handleMfaSubmit} noValidate>
              {error && <Alert variant="error">{error}</Alert>}

              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <p className="text-xs text-zinc-300">
                  Ingresa el código de seguridad de 6 dígitos generado por tu aplicación de
                  autenticación.
                </p>
              </div>

              <div>
                <Label className="auth-linear-label mb-1.5" htmlFor="mfa_code">
                  Código MFA
                </Label>
                <Input
                  ref={mfaInputRef}
                  id="mfa_code"
                  name="mfa_code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  leadingIcon={<ShieldCheck />}
                  placeholder="000000"
                  className="auth-linear-field text-center font-mono text-lg tracking-[0.35em]"
                  value={mfaCode}
                  onChange={(e) => handleMfaChange(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="auth-linear-primary mt-1 w-full"
                size="lg"
                loading={loading}
              >
                {loading ? 'Verificando...' : 'Verificar'}
              </Button>

              <button
                type="button"
                className="text-center text-xs font-semibold text-zinc-400 transition-colors hover:text-zinc-200"
                onClick={() => {
                  hapticLight();
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
                  <div className="flex items-center gap-2 font-semibold">
                    <Clock className="h-4 w-4 shrink-0 text-red-400" />
                    <span>Demasiados intentos fallidos.</span>
                  </div>
                  <p className="mt-1 text-xs text-red-200 tabular-nums" aria-live="polite">
                    Podrás intentar de nuevo en {formatCountdown(remainingSeconds)}
                  </p>
                </Alert>
              ) : (
                error && <Alert variant="error">{error}</Alert>
              )}

              <div>
                <Label className="auth-linear-label mb-1.5" htmlFor="email">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isLocked}
                  leadingIcon={<Mail />}
                  placeholder="correo@ejemplo.com"
                  className="auth-linear-field"
                  value={email}
                  error={fieldErrors.email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                    if (error) setError('');
                  }}
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Label className="auth-linear-label" htmlFor="password">
                    Contraseña
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="auth-linear-link text-xs font-medium"
                    aria-label="¿Olvidaste tu contraseña?"
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
                  className="auth-linear-field"
                  value={password}
                  error={fieldErrors.password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                    if (error) setError('');
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="group flex cursor-pointer items-center gap-2 text-xs select-none">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-800 text-amber-500 transition focus:ring-1 focus:ring-amber-500 focus:ring-offset-0"
                    checked={rememberEmail}
                    onChange={(e) => {
                      hapticLight();
                      setRememberEmail(e.target.checked);
                    }}
                  />
                  <span className="text-zinc-400 transition-colors group-hover:text-zinc-300">
                    Recordar mi correo
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                className="auth-linear-primary mt-1 w-full"
                size="lg"
                loading={loading}
                disabled={isLocked}
              >
                {isLocked
                  ? `Espera ${formatCountdown(remainingSeconds)}`
                  : loading
                    ? 'Iniciando sesión...'
                    : 'Entrar'}
              </Button>

              {registerAllowed && (
                <p className="pt-1 text-center text-xs text-zinc-400">
                  ¿No tienes una cuenta?{' '}
                  <Link to="/register" className="auth-linear-link font-semibold">
                    Regístrate aquí
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
