import React, { useState, useEffect } from 'react';
import { apiFetch, parseJsonResponse, parseJsonSafe } from '../lib/api';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDefaultRouteForRole } from '../lib/roles';
import { Mail } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import AuthBrandHeader from '../components/AuthBrandHeader';
import { Button, Card, Input, Label, PasswordInput, Spinner } from '../components/ui';

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
    apiFetch('/api/health')
      .then((res) => parseJsonSafe<{ allowPublicRegister?: boolean }>(res))
      .then((data) => setRegisterAllowed(data.allowPublicRegister !== false))
      .catch(() => setRegisterAllowed(true));
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
      <Card className="w-full page-stack-loose shadow-xl mt-8 sm:mt-10 rounded-2xl" padding="md">
        <AuthBrandHeader subtitle="Inicia sesión en tu cuenta" />

        <form className="form-stack" onSubmit={handleSubmit} noValidate>
          {error && (
            <div
              role="alert"
              className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-500 border border-red-500/20"
            >
              {error}
            </div>
          )}

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

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Spinner className="h-4 w-4" />
                Ingresando…
              </>
            ) : (
              'Entrar'
            )}
          </Button>

          {registerAllowed && (
            <p className="text-center text-xs text-zinc-500">
              ¿No tienes una cuenta?{' '}
              <Link to="/register" className="font-semibold text-orange-600 hover:text-orange-500">
                Regístrate aquí
              </Link>
            </p>
          )}
        </form>
      </Card>
    </AuthShell>
  );
}
