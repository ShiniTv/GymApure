import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import AuthShell from '../components/AuthShell';
import AuthLinearHeader from '../components/AuthLinearHeader';
import { Button, Label, PasswordInput, Alert } from '../components/ui';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('El enlace de recuperación no es válido.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          new_password: password,
          confirm_password: confirmPassword,
        }),
      });
      const data = await parseJsonResponse<{ message: string }>(res);
      setSuccess(data.message);
      window.setTimeout(() => {
        void navigate('/login');
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell aesthetic="linear">
      <div className="auth-linear-card">
        <AuthLinearHeader subtitle="Establece tu nueva contraseña" />

        <div className="auth-form-wrap">
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {error && <Alert variant="error">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <div>
              <Label className="auth-linear-label mb-1.5" htmlFor="password">
                Nueva contraseña
              </Label>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="new-password"
                required
                className="auth-linear-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <Label className="auth-linear-label mb-1.5" htmlFor="confirm_password">
                Confirmar contraseña
              </Label>
              <PasswordInput
                id="confirm_password"
                name="confirm_password"
                autoComplete="new-password"
                required
                className="auth-linear-field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              className="auth-linear-primary group relative mt-1 flex w-full items-center justify-center gap-2"
              size="lg"
              loading={loading}
              disabled={!!success || !token}
            >
              <span>{loading ? 'Guardando...' : 'Guardar nueva contraseña'}</span>
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
    </AuthShell>
  );
}
