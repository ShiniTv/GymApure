import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import AuthShell from '../components/AuthShell';
import AuthBrandHeader from '../components/AuthBrandHeader';
import AuthFormSurface from '../components/AuthFormSurface';
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
    <AuthShell layout="split">
      <AuthFormSurface>
        <AuthBrandHeader
          subtitle="Nueva contraseña"
          formHint="Elige una contraseña segura"
          splitAware
        />

        <form className="form-stack mt-2 lg:mt-8" onSubmit={handleSubmit} noValidate>
          {error && <Alert variant="error">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <div>
            <Label htmlFor="password">Nueva contraseña</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="confirm_password">Confirmar contraseña</Label>
            <PasswordInput
              id="confirm_password"
              name="confirm_password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" loading={loading} disabled={!!success || !token}>
            Guardar contraseña
          </Button>
        </form>

        <Link
          to="/login"
          className="hover:text-brand mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio de sesión
        </Link>
      </AuthFormSurface>
    </AuthShell>
  );
}
