import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import AuthShell from '../components/AuthShell';
import AuthLinearHeader from '../components/AuthLinearHeader';
import { Button, Input, Label, Alert } from '../components/ui';

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
    <AuthShell aesthetic="linear">
      <div className="auth-doppelrand-shell">
        <div className="auth-linear-card">
          <AuthLinearHeader subtitle="Recupera el acceso a tu cuenta" />

          <div className="auth-form-wrap">
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {error && <Alert variant="error">{error}</Alert>}
              {success && (
                <Alert variant="success">
                  <p>{success}</p>
                  {import.meta.env.DEV && (
                    <p className="mt-2 text-xs opacity-80">
                      En desarrollo: si no llega el correo, mira la{' '}
                      <strong>terminal del servidor</strong> — ahí se imprime el enlace de
                      recuperación.
                    </p>
                  )}
                </Alert>
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
                  placeholder="correo@ejemplo.com"
                  className="auth-linear-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="auth-linear-primary group relative mt-1 flex w-full items-center justify-center gap-2"
                size="lg"
                loading={loading}
                disabled={!!success}
              >
                <span>{loading ? 'Enviando...' : 'Enviar enlace de recuperación'}</span>
                {!loading && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10 transition-transform duration-200 group-hover:translate-x-0.5">
                    <ArrowRight className="h-3 w-3" />
                  </span>
                )}
              </Button>

              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-zinc-400 transition-colors hover:text-zinc-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver al inicio de sesión
              </Link>
            </form>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
