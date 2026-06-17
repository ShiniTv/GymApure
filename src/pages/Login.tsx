import React, { useState, useEffect } from 'react';
import { apiFetch, parseJsonResponse, parseJsonSafe } from '../lib/api';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail } from 'lucide-react';
import Logo from '../components/Logo';
import AuthShell from '../components/AuthShell';
import { Button, Card, Input, Label, PasswordInput } from '../components/ui';

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
    <AuthShell>
      <Card className="w-full space-y-8 shadow-xl mt-10" padding="lg">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-500/10 ring-1 ring-orange-500/50">
            <Logo className="h-12 w-12" />
          </div>
          <h1 className="mt-6 text-3xl font-black tracking-tighter text-zinc-900 dark:text-white uppercase italic">
            CARIBEAN <span className="text-orange-500">GYM</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Inicia sesión en tu cuenta</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-500 border border-red-500/20">
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
            {loading ? 'Ingresando…' : 'Entrar'}
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

      <p className="text-center mt-6 text-xs text-zinc-500">
        ¿Vienes al gym?{' '}
        <Link to="/check-in" className="font-bold text-orange-600 hover:text-orange-500">
          Registro de entrada
        </Link>
      </p>
    </AuthShell>
  );
}
