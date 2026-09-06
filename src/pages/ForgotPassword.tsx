import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
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
      <div className="auth-linear-card">
        <AuthLinearHeader
          title="Recupera el acceso"
          subtitle="Te enviamos un enlace al correo de la cuenta."
        />

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {error && <Alert variant="error">{error}</Alert>}
          {success && (
            <Alert variant="success">
              <p>{success}</p>
              {import.meta.env.DEV && (
                <p className="mt-2 text-xs opacity-80">
                  En desarrollo: si no llega el correo, mira la{' '}
                  <strong>terminal del servidor</strong> — ahí se imprime el enlace de recuperación.
                </p>
              )}
            </Alert>
          )}

          <div>
            <Label className="auth-linear-label" htmlFor="email">
              Correo
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
            className="auth-linear-primary w-full"
            loading={loading}
            disabled={!!success}
          >
            Enviar enlace
          </Button>
        </form>

        <Link
          to="/login"
          className="auth-linear-link mt-4 inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio de sesión
        </Link>
      </div>
    </AuthShell>
  );
}
