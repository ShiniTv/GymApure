import { useEffect, useState } from 'react';
import { Check, Copy, ShieldCheck, ShieldOff } from 'lucide-react';
import { apiFetch, parseJsonResponse, toDisplayErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  PageHeader,
  PasswordInput,
  Skeleton,
} from '../components/ui';
import { cn } from '../lib/utils';

interface MfaStatus {
  mfa_enabled: boolean;
  mfa_pending: boolean;
}

interface MfaSetupResponse {
  secret: string;
  qr_data_url: string;
  manual_entry_key: string;
}

const SURFACE = 'border-border bg-surface';

const STEPS = [
  { n: '1', title: 'App', detail: 'Abre Authenticator o Authy' },
  { n: '2', title: 'Escanea', detail: 'Lee el QR o pega la clave' },
  { n: '3', title: 'Código', detail: 'Confirma con 6 dígitos' },
] as const;

export default function MfaSecurity() {
  usePageTitle('Seguridad MFA');
  const { user } = useAuth();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [setup, setSetup] = useState<MfaSetupResponse | null>(null);
  const [enableCode, setEnableCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const loadStatus = async () => {
    const res = await apiFetch('/api/auth/mfa/status');
    const data = await parseJsonResponse<MfaStatus>(res);
    setStatus(data);
  };

  useEffect(() => {
    void loadStatus()
      .catch((err) => {
        setError(toDisplayErrorMessage(err, 'No se pudo cargar el estado MFA'));
      })
      .finally(() => setStatusLoading(false));
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
      setMessage('Escanea el QR con tu app de autenticación.');
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

  const copyManualKey = async () => {
    if (!setup?.manual_entry_key) return;
    try {
      await navigator.clipboard.writeText(setup.manual_entry_key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('No se pudo copiar la clave');
    }
  };

  if (!user) return null;

  const enabled = Boolean(status?.mfa_enabled);
  const showGuide = !enabled && !setup;

  return (
    <div className="page-stack-tight mx-auto w-full max-w-3xl">
      <PageHeader
        compact
        title={
          <>
            Seguridad <span className="text-brand">MFA</span>
          </>
        }
        subtitle="Verificación en 2 pasos para tu cuenta de staff"
      />

      <div className="grid gap-3 lg:grid-cols-1 lg:gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:items-stretch">
        <div className="space-y-3 sm:space-y-4">
          {/* Status row */}
          <Card padding="sm" rounded="xl" className={cn(SURFACE, 'lg:p-4')}>
            {statusLoading ? (
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      enabled ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                    )}
                  >
                    {enabled ? (
                      <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ShieldOff className="h-5 w-5 text-amber-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-text text-sm font-semibold">
                        {enabled ? 'MFA activo' : 'MFA inactivo'}
                      </p>
                      <Badge variant={enabled ? 'success' : 'warning'}>
                        {enabled ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <p className="text-text-muted text-small mt-0.5 leading-snug sm:text-sm">
                      {enabled
                        ? 'Se pedirá un código al iniciar sesión.'
                        : 'Recomendado si gestionas miembros o pagos.'}
                    </p>
                  </div>
                </div>

                {!enabled && !setup ? (
                  <Button
                    size="sm"
                    className="w-full shrink-0 sm:w-auto"
                    onClick={() => void startSetup()}
                    loading={loading}
                  >
                    Configurar MFA
                  </Button>
                ) : null}
              </div>
            )}

            {message ? (
              <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{message}</p>
            ) : null}
            {error ? <p className="text-danger dark:text-danger mt-3 text-sm">{error}</p> : null}
          </Card>

          {/* Setup flow */}
          {!enabled && setup ? (
            <Card padding="sm" rounded="xl" className={cn(SURFACE, 'space-y-4 lg:p-4')}>
              <div>
                <p className="text-text-muted text-small font-semibold tracking-wide uppercase">
                  Paso 1 · Escanea
                </p>
                <img
                  src={setup.qr_data_url}
                  alt="Código QR MFA"
                  className="border-border bg-surface mx-auto mt-3 h-44 w-44 rounded-xl border p-2 sm:h-48 sm:w-48"
                />
                <div className="border-border bg-surface-raised mt-3 flex items-center gap-2 rounded-xl border px-3 py-2">
                  <p className="text-text-secondary text-small min-w-0 flex-1 truncate font-mono">
                    {setup.manual_entry_key}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    onClick={() => void copyManualKey()}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" aria-hidden />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-text-muted text-small mb-2 font-semibold tracking-wide uppercase">
                  Paso 2 · Código
                </p>
                <Label htmlFor="enable-code">Código de 6 dígitos</Label>
                <Input
                  id="enable-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={enableCode}
                  onChange={(e) => setEnableCode(e.target.value)}
                  placeholder="123456"
                  className="mt-1 max-w-[10rem] tracking-[0.2em]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => void enableMfa()} loading={loading}>
                  Activar MFA
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={loading}
                  onClick={() => {
                    setSetup(null);
                    setEnableCode('');
                    setMessage('');
                    setError('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </Card>
          ) : null}

          {/* Disable — secondary risk zone */}
          {enabled ? (
            <div
              className={cn(
                'border-border space-y-3 rounded-xl border px-3 py-3 sm:px-4 sm:py-4',
                'bg-surface-raised/50'
              )}
            >
              <div>
                <p className="text-text text-sm font-semibold">Desactivar MFA</p>
                <p className="text-text-muted text-small mt-0.5">
                  Requiere tu contraseña y un código actual.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="disable-password">Contraseña actual</Label>
                  <PasswordInput
                    id="disable-password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="disable-code">Código MFA</Label>
                  <Input
                    id="disable-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value)}
                    placeholder="123456"
                    className="mt-1 max-w-[10rem] tracking-[0.2em]"
                  />
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void disableMfa()}
                loading={loading}
              >
                Desactivar MFA
              </Button>
            </div>
          ) : null}
        </div>

        {/* Guide — fills empty space when inactive */}
        {showGuide || statusLoading ? (
          <aside
            className={cn('flex flex-col rounded-xl border px-3 py-3 sm:px-4 sm:py-4', SURFACE)}
          >
            <p className="text-text text-sm font-semibold">Cómo funciona</p>
            <p className="text-text-muted text-small mt-1 leading-snug">
              Un código de tu teléfono confirma que eres tú, además de la contraseña.
            </p>
            <ol className="mt-3 space-y-2.5">
              {STEPS.map((step) => (
                <li key={step.n} className="flex gap-2.5">
                  <span className="bg-brand/10 text-brand text-small flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-bold">
                    {step.n}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-text text-sm font-semibold">{step.title}</p>
                    <p className="text-text-muted text-small">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        ) : enabled ? (
          <aside
            className={cn('flex flex-col rounded-xl border px-3 py-3 sm:px-4 sm:py-4', SURFACE)}
          >
            <p className="text-text text-sm font-semibold">Protección activa</p>
            <p className="text-text-muted text-small mt-1 leading-snug">
              En cada inicio de sesión te pediremos el código de 6 dígitos de tu app.
            </p>
          </aside>
        ) : (
          <aside
            className={cn('flex flex-col rounded-xl border px-3 py-3 sm:px-4 sm:py-4', SURFACE)}
          >
            <p className="text-text text-sm font-semibold">Mientras configuras</p>
            <ol className="mt-3 space-y-2.5">
              {STEPS.map((step) => (
                <li key={step.n} className="flex gap-2.5">
                  <span className="bg-brand/10 text-brand text-small flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-bold">
                    {step.n}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-text text-sm font-semibold">{step.title}</p>
                    <p className="text-text-muted text-small">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        )}
      </div>
    </div>
  );
}
