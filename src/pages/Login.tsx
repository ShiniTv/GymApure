import React, { useState, useEffect } from 'react';
import { apiFetch, parseJsonResponse, parseJsonSafe } from '../lib/api';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  const { login } = useAuth();
  const navigate = useNavigate();

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
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de inicio de sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      footer={
        <p className="text-center text-xs text-zinc-500">
          ¿Vienes al gym?{' '}
          <Link to="/check-in" className="font-bold text-orange-600 hover:text-orange-500">
            Registro de entrada
          </Link>
        </p>
      }
    >
      <Card className="w-full space-y-8 shadow-xl mt-10" padding="lg">
        <AuthBrandHeader subtitle="Inicia sesión en tu cuenta" />

        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          {error && (
            <div
              role="alert"
              className="rounded-xl bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-500 border border-red-500/20"
            >
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 z-10">
                  <Mail className="h-5 w-5 text-zinc-400" />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="pl-10"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
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
              <Link to="/register" className="font-bold text-orange-600 hover:text-orange-500">
                Regístrate aquí
              </Link>
            </p>
          )}
        </form>
      </Card>
    </AuthShell>
  );
}
