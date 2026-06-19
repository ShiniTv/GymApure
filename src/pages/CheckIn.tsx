import React, { useState, useEffect, useRef } from 'react';
import { apiFetch, parseJsonSafe } from '../lib/api';
import { CheckCircle, XCircle, LogIn, LogOut } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { getKioskClientKey } from '../lib/kiosk.ts';
import { APP_VERSION } from '../lib/appVersion';
import AuthShell from '../components/AuthShell';
import AuthBrandHeader from '../components/AuthBrandHeader';
import { Button, Card, Input, SegmentedControl, Spinner } from '../components/ui';
import { cn } from '../lib/utils';

type KioskMode = 'check-in' | 'check-out';

export default function CheckIn() {
  const [searchParams] = useSearchParams();
  const isKioskMode = searchParams.get('kiosk') === '1';

  const [mode, setMode] = useState<KioskMode>('check-in');
  const [cedula, setCedula] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [expiryWarning, setExpiryWarning] = useState('');
  const [durationLabel, setDurationLabel] = useState('');
  const [userName, setUserName] = useState('');
  const cedulaRef = useRef<HTMLInputElement>(null);

  const isCheckIn = mode === 'check-in';

  useEffect(() => {
    if (status === 'idle') {
      cedulaRef.current?.focus();
    }
  }, [status, mode]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cedula.trim() && status === 'idle') return;

    setStatus('scanning');
    setDurationLabel('');

    const started = Date.now();

    const finishScan = async () => {
      const kioskKey = getKioskClientKey();
      if (!kioskKey) {
        setStatus('error');
        setMessage('Kiosk no configurado (falta VITE_KIOSK_KEY en el servidor).');
        setTimeout(() => setStatus('idle'), 5000);
        return;
      }

      const endpoint = isCheckIn ? '/api/attendance/check-in' : '/api/attendance/check-out';

      try {
        const res = await apiFetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Kiosk-Key': kioskKey,
          },
          body: JSON.stringify({ cedula: cedula.trim() }),
        });

        const data = await parseJsonSafe<{
          error?: string;
          user_name?: string;
          already_checked_in?: boolean;
          already_checked_out?: boolean;
          expiry_warning?: string;
          duration_label?: string;
          message?: string;
        }>(res);

        if (res.ok) {
          setStatus('success');
          setUserName(data.user_name ?? '');
          setExpiryWarning(data.expiry_warning || '');
          setDurationLabel(data.duration_label || '');

          if (isCheckIn) {
            setMessage(
              data.already_checked_in
                ? 'Ya tienes un ingreso activo hoy.'
                : '¡Bienvenido! Que tengas un excelente entrenamiento.'
            );
          } else {
            setMessage(
              data.already_checked_out
                ? 'Ya registraste tu salida hoy.'
                : data.message || '¡Hasta pronto! Salida registrada.'
            );
          }

          setCedula('');
          setTimeout(() => {
            setStatus('idle');
            setExpiryWarning('');
            setDurationLabel('');
          }, 4500);
        } else {
          setStatus('error');
          setMessage(data.error || (isCheckIn ? 'Ingreso fallido' : 'Salida fallida'));
          setExpiryWarning('');
          if (data.user_name) setUserName(data.user_name);
          setTimeout(() => setStatus('idle'), 4000);
        }
      } catch {
        setStatus('error');
        setMessage('Error de red');
        setTimeout(() => setStatus('idle'), 4000);
      }
    };

    const minDelay = 600;
    const elapsed = Date.now() - started;
    const wait = Math.max(0, minDelay - elapsed);
    setTimeout(finishScan, wait);
  };

  return (
    <AuthShell
      variant="kiosk"
      backLink={isKioskMode ? undefined : { to: '/login', label: 'Volver al login' }}
    >
      <AuthBrandHeader subtitle="Control de acceso" size="lg" className="mb-8" />

      <SegmentedControl
        variant="kiosk"
        fullWidth
        value={mode}
        onChange={(next) => {
          setMode(next);
          setStatus('idle');
        }}
        options={[
          { value: 'check-in', label: 'Entrada', icon: LogIn, accent: 'brand' },
          { value: 'check-out', label: 'Salida', icon: LogOut, accent: 'check-out' },
        ]}
        className="mb-6"
      />

      <Card padding="lg" rounded="3xl" className="shadow-2xl transition-all">
        {status === 'idle' || status === 'scanning' ? (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="text-center space-y-4">
              <div
                className={cn(
                  'mx-auto h-32 w-32 rounded-3xl border-2 flex items-center justify-center transition-all relative overflow-hidden',
                  status === 'scanning'
                    ? isCheckIn
                      ? 'border-orange-500 ring-4 ring-orange-500/20'
                      : 'border-blue-500 ring-4 ring-blue-500/20'
                    : 'border-zinc-200 dark:border-zinc-800'
                )}
              >
                {status === 'scanning' && (
                  <div
                    className={cn(
                      'absolute inset-0 animate-scan-line',
                      isCheckIn
                        ? 'bg-gradient-to-t from-orange-500/20 to-transparent'
                        : 'bg-gradient-to-t from-blue-500/20 to-transparent'
                    )}
                  />
                )}
                {status === 'scanning' ? (
                  <Spinner className="h-10 w-10 relative z-10" />
                ) : (
                  isCheckIn ? (
                    <LogIn className="h-16 w-16 text-orange-500/40" />
                  ) : (
                    <LogOut className="h-16 w-16 text-blue-500/40" />
                  )
                )}
              </div>
              <div>
                <h2 className="text-zinc-900 dark:text-white font-bold text-lg">
                  {status === 'scanning'
                    ? 'Verificando…'
                    : isCheckIn
                      ? 'Registro de entrada'
                      : 'Registro de salida'}
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {isCheckIn
                    ? 'Ingrese su cédula para registrar la entrada'
                    : 'Ingrese su cédula para registrar la salida'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                ref={cedulaRef}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                aria-label="Cédula de identidad"
                className="text-center text-xl md:text-2xl font-mono tracking-widest py-4 placeholder-zinc-300 dark:placeholder-zinc-700"
                placeholder="V-00000000"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                disabled={status === 'scanning'}
              />

              <Button
                type="submit"
                size="lg"
                disabled={status === 'scanning' || !cedula.trim()}
                className={cn(
                  'w-full',
                  !isCheckIn && 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                )}
              >
                {status === 'scanning' ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Verificando…
                  </>
                ) : isCheckIn ? (
                  'Registrar entrada'
                ) : (
                  'Registrar salida'
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div
            className={cn(
              'py-8 text-center',
              status === 'success' ? (isCheckIn ? 'text-emerald-500' : 'text-blue-500') : 'text-red-500'
            )}
          >
            <div
              className={cn(
                'mx-auto h-24 w-24 rounded-full flex items-center justify-center mb-6',
                status === 'success'
                  ? isCheckIn ? 'bg-emerald-500/10' : 'bg-blue-500/10'
                  : 'bg-red-500/10'
              )}
            >
              {status === 'success' ? (
                <CheckCircle className="h-12 w-12" />
              ) : (
                <XCircle className="h-12 w-12" />
              )}
            </div>
            <h2 className="text-3xl font-black mb-2 uppercase italic tracking-tight text-zinc-900 dark:text-white">
              {status === 'success'
                ? isCheckIn ? 'Acceso concedido' : 'Salida registrada'
                : 'Acceso denegado'}
            </h2>
            <div className="space-y-1">
              <p className="text-xl font-bold text-zinc-900 dark:text-white">
                {status === 'success' ? userName : userName || 'Error de validación'}
              </p>
              <p className="text-zinc-500 dark:text-zinc-400">{message}</p>
              {durationLabel && (
                <p className="text-sm font-black uppercase tracking-widest text-blue-500 mt-2">
                  Tiempo en gym: {durationLabel}
                </p>
              )}
              {expiryWarning && (
                <p className="text-sm font-black uppercase tracking-widest text-orange-500 mt-2">
                  {expiryWarning}
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              className="mt-8"
              onClick={() => setStatus('idle')}
            >
              Volver a escanear
            </Button>
          </div>
        )}
      </Card>

      <div className="mt-8 flex flex-col items-center gap-3">
        <div className="flex justify-center gap-6">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Sistema activo
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600" />
            v{APP_VERSION}
          </div>
        </div>
        {!isKioskMode && (
          <Link to="/login" className="text-xs text-zinc-500 hover:text-orange-500 transition-colors">
            ¿Eres miembro? Inicia sesión
          </Link>
        )}
      </div>
    </AuthShell>
  );
}
