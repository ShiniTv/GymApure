import React, { useState, useEffect } from 'react';
import { apiFetch, parseJsonResponse, parseJsonSafe } from '../lib/api';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDefaultRouteForRole } from '../lib/roles';
import { Mail } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import AuthBrandHeader from '../components/AuthBrandHeader';
import { Button, Card, Input, Label, PasswordInput, Alert } from '../components/ui';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registerAllowed, setRegisterAllowed] = useState(true);
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();

  if (!isLoading && user) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
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
      apiFetch('/api/health')
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
    setLoading(true);

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await parseJsonResponse<{ user: Parameters<typeof login>[0] }>(res);
      login(data.user);
      navigate(getDefaultRouteForRole(data.user.role));
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
              onChange={(e) => setEmail(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
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
