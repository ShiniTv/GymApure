import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { apiFetch, parseJsonResponse, toDisplayErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { Button, Card, Input, Label, PasswordInput } from '../components/ui';

interface MfaStatus {
  mfa_enabled: boolean;
  mfa_pending: boolean;
}

interface MfaSetupResponse {
  secret: string;
  qr_data_url: string;
  manual_entry_key: string;
}

export default function MfaSecurity() {
  usePageTitle('Seguridad MFA');
  const { user } = useAuth();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [setup, setSetup] = useState<MfaSetupResponse | null>(null);
  const [enableCode, setEnableCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadStatus = async () => {
    const res = await apiFetch('/api/auth/mfa/status');
    const data = await parseJsonResponse<MfaStatus>(res);
    setStatus(data);
  };

  useEffect(() => {
    void loadStatus().catch((err) => {
      setError(toDisplayErrorMessage(err, 'No se pudo cargar el estado MFA'));
    });
  }, []);

  const startSetup = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await apiFetch('/api/auth/mfa/setup', { method: 'POST' });
      const data = await parseJsonResponse<MfaSetupResponse>(res);
      setSetup(data);
      setEnableCode('');
      await loadStatus();
      setMessage('Escanea el código QR con Google Authenticator, Authy u otra app TOTP.');
    } catch (err) {
      setError(toDisplayErrorMessage(err, 'No se pudo iniciar la configuración MFA'));
    } finally {
      setLoading(false);
    }
  };

  const enableMfa = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await apiFetch('/api/auth/mfa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: enableCode.trim() }),
      });
      await parseJsonResponse(res);
      setSetup(null);
      setEnableCode('');
      await loadStatus();
      setMessage('MFA activado correctamente.');
    } catch (err) {
      setError(toDisplayErrorMessage(err, 'No se pudo activar MFA'));
    } finally {
      setLoading(false);
    }
  };

  const disableMfa = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await apiFetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: disablePassword,
          code: disableCode.trim(),
        }),
      });
      await parseJsonResponse(res);
      setDisablePassword('');
      setDisableCode('');
      setSetup(null);
      await loadStatus();
      setMessage('MFA desactivado.');
    } catch (err) {
      setError(toDisplayErrorMessage(err, 'No se pudo desactivar MFA'));
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="page-stack max-w-2xl">
      <div>
        <h1 className="page-title">
          Seguridad <span className="text-brand">MFA</span>
        </h1>
        <p className="page-subtitle">
          Protege tu cuenta de {user.role === 'admin' ? 'administrador' : 'recepción'} con
          verificación en dos pasos (TOTP).
        </p>
      </div>

      <Card padding="md" className="page-stack">
        <div className="flex items-center gap-3">
          {status?.mfa_enabled ? (
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
          ) : (
            <ShieldOff className="h-6 w-6 text-amber-500" />
          )}
          <div>
            <p className="font-semibold text-zinc-900 dark:text-white">
              {status?.mfa_enabled ? 'MFA activo' : 'MFA inactivo'}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {status?.mfa_enabled
                ? 'Se solicitará un código al iniciar sesión.'
                : 'Recomendado para cuentas con acceso a datos de miembros y pagos.'}
            </p>
          </div>
        </div>

        {message && <p className="text-sm text-emerald-600">{message}</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {!status?.mfa_enabled && (
          <>
            {!setup ? (
              <Button onClick={() => void startSetup()} loading={loading}>
                Configurar MFA
              </Button>
            ) : (
              <div className="page-stack">
                <img
                  src={setup.qr_data_url}
                  alt="Código QR MFA"
                  className="mx-auto h-48 w-48 rounded-xl border border-zinc-200 bg-white p-2 dark:border-zinc-700"
                />
                <p className="text-center font-mono text-xs text-zinc-500">
                  {setup.manual_entry_key}
                </p>
                <div>
                  <Label htmlFor="enable-code">Código de verificación</Label>
                  <Input
                    id="enable-code"
                    inputMode="numeric"
                    value={enableCode}
                    onChange={(e) => setEnableCode(e.target.value)}
                    placeholder="123456"
                  />
                </div>
                <Button onClick={() => void enableMfa()} loading={loading}>
                  Activar MFA
                </Button>
              </div>
            )}
          </>
        )}

        {status?.mfa_enabled && (
          <div className="page-stack border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Desactivar MFA</p>
            <div>
              <Label htmlFor="disable-password">Contraseña actual</Label>
              <PasswordInput
                id="disable-password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="disable-code">Código MFA</Label>
              <Input
                id="disable-code"
                inputMode="numeric"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder="123456"
              />
            </div>
            <Button variant="secondary" onClick={() => void disableMfa()} loading={loading}>
              Desactivar MFA
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
