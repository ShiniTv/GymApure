import React, { useState, useEffect } from 'react';
import { apiFetch, parseJsonSafe } from '../lib/api';
import { useNavigate, Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { type UserRole } from '../lib/roles';
import { safeReturnPath } from '../lib/safeReturnPath';
import { Mail } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import AuthBrandHeader from '../components/AuthBrandHeader';
import { Button, Card, Input, Label, PasswordInput, Alert } from '../components/ui';

interface LoginUser {
  id: number;
  email: string;
  role: UserRole;
  name: string;
}

interface LoginLocationState {
  from?: { pathname: string; search?: string } | string;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [registerAllowed, setRegisterAllowed] = useState(true);
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LoginLocationState | null)?.from;

  if (!isLoading && user) {
    return <Navigate to={safeReturnPath(from, user.role)} replace />;
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const data = await parseJsonSafe<{
        user: LoginUser;
        error?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(data.error || 'Error de inicio de sesión');
      }

      if (!data.user) {
        throw new Error('Respuesta de inicio de sesión inválida');
      }

      login(data.user);
      navigate(safeReturnPath(from, data.user.role));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de inicio de sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Card className="page-stack-loose mt-8 w-full rounded-2xl shadow-xl sm:mt-10" padding="md">
        <AuthBrandHeader subtitle="Inicia sesión en tu cuenta" />

        <form className="form-stack" onSubmit={handleSubmit} noValidate>
          {error && <Alert variant="error">{error}</Alert>}

          <div>
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
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
            <Label htmlFor="password">Contraseña</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              required
              placeholder="Tu contraseña"
              value={password}
              error={fieldErrors.password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
              }}
            />
          </div>

          <p className="text-right">
            <Link
              to="/forgot-password"
              className="text-brand hover:text-brand text-xs font-semibold"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </p>

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Entrar
          </Button>

          {registerAllowed && (
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              ¿No tienes una cuenta?{' '}
              <Link to="/register" className="text-brand hover:text-brand font-semibold">
                Regístrate aquí
              </Link>
            </p>
          )}
        </form>
      </Card>
    </AuthShell>
  );
}
