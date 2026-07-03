import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import AuthShell from '../components/AuthShell';
import AuthBrandHeader from '../components/AuthBrandHeader';
import { Button, Card, Input, Label, Spinner } from '../components/ui';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await parseJsonResponse<{ message: string }>(res);
      setSuccess(data.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Card className="page-stack-loose mt-8 w-full rounded-2xl shadow-xl sm:mt-10" padding="md">
        <AuthBrandHeader subtitle="Recuperar contraseña" />

        <form className="form-stack" onSubmit={handleSubmit} noValidate>
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-500"
            >
              {error}
            </div>
          )}
          {success && (
            <div
              role="status"
              className="space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400"
            >
              <p>{success}</p>
              {import.meta.env.DEV && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  En desarrollo: si no llega el correo, mira la{' '}
                  <strong>terminal del servidor</strong> — ahí se imprime el enlace de recuperación.
                </p>
              )}
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

          <Button type="submit" className="w-full" disabled={loading || !!success}>
            {loading ? <Spinner className="h-4 w-4" /> : 'Enviar enlace'}
          </Button>
        </form>

        <Link
          to="/login"
          className="hover:text-brand mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio de sesión
        </Link>
      </Card>
    </AuthShell>
  );
}
