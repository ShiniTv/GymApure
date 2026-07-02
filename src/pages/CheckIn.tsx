import React, { useState, useEffect, useRef } from 'react';
import { apiFetch, parseJsonSafe } from '../lib/api';
import { CheckCircle, XCircle, LogIn, LogOut, Clock } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { dateLocale as es } from '../lib/dateLocale';
import { APP_VERSION } from '../lib/appVersion';
import AuthShell from '../components/AuthShell';
import AuthBrandHeader from '../components/AuthBrandHeader';
import BrandName from '../components/BrandName';
import Logo from '../components/Logo';
import { BRAND } from '../config/brand';
import { Button, Card, Input, SegmentedControl, Spinner, CedulaInput } from '../components/ui';
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
  const [now, setNow] = useState(new Date());
  const cedulaRef = useRef<HTMLInputElement>(null);

  const isCheckIn = mode === 'check-in';

  useEffect(() => {
    if (!isKioskMode) return;
    const tick = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(tick);
  }, [isKioskMode]);

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
      const endpoint = isCheckIn ? '/api/reception/check-in' : '/api/reception/check-out';

      try {
        const res = await apiFetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
            cedulaRef.current?.focus();
          }, isKioskMode ? 3500 : 4500);
        } else {
          setStatus('error');
          setMessage(data.error || (isCheckIn ? 'Ingreso fallido' : 'Salida fallida'));
          setExpiryWarning('');
          if (data.user_name) setUserName(data.user_name);
          setTimeout(() => {
            setStatus('idle');
            cedulaRef.current?.focus();
          }, isKioskMode ? 3500 : 4000);
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

  const formContent = (
    <>
      {status === 'idle' || status === 'scanning' ? (
        <form onSubmit={handleSubmit} className={cn('space-y-8', isKioskMode && 'space-y-10')}>
          <div className="text-center space-y-4">
            <div
              className={cn(
                'mx-auto rounded-3xl border-2 flex items-center justify-center transition-all relative overflow-hidden',
                isKioskMode ? 'h-40 w-40' : 'h-32 w-32',
                status === 'scanning'
                  ? isCheckIn
                    ? 'border-brand ring-4 ring-brand/20'
                    : 'border-[var(--color-check-out)] ring-4 ring-[var(--color-check-out)]/20'
                  : 'border-zinc-200 dark:border-zinc-800'
              )}
            >
              {status === 'scanning' && (
                <div
                  className={cn(
                    'absolute inset-0 animate-scan-line',
                    isCheckIn
                      ? 'bg-gradient-to-t from-brand/20 to-transparent'
                      : 'bg-gradient-to-t from-[var(--color-check-out)]/20 to-transparent'
                  )}
                />
              )}
              {status === 'scanning' ? (
                <Spinner size={isKioskMode ? '2xl' : 'xl'} className="relative z-10" />
              ) : isCheckIn ? (
                <LogIn className={cn('text-brand/40', isKioskMode ? 'h-20 w-20' : 'h-16 w-16')} />
              ) : (
                <LogOut className={cn('text-blue-500/40', isKioskMode ? 'h-20 w-20' : 'h-16 w-16')} />
              )}
            </div>
            <div>
              <h2 className={cn('text-zinc-900 dark:text-white font-bold', isKioskMode ? 'text-2xl' : 'text-lg')}>
                {status === 'scanning'
                  ? 'Verificando…'
                  : isCheckIn
                    ? 'Registro de entrada'
                    : 'Registro de salida'}
              </h2>
              <p className={cn('text-zinc-500 dark:text-zinc-400 mt-1', isKioskMode ? 'text-base' : 'text-sm')}>
                {isCheckIn
                  ? 'Ingrese su cédula para registrar la entrada'
                  : 'Ingrese su cédula para registrar la salida'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <CedulaInput
              ref={cedulaRef}
              variant={isKioskMode ? 'kiosk' : 'default'}
              value={cedula}
              onChange={setCedula}
              disabled={status === 'scanning'}
              className={!isKioskMode ? 'text-xl md:text-2xl py-4' : undefined}
            />

            <Button
              type="submit"
              size="lg"
              loading={status === 'scanning'}
              disabled={!cedula.trim()}
              className={cn(
                'w-full',
                isKioskMode && 'min-h-[64px] text-lg',
                !isCheckIn && 'bg-[var(--color-check-out)] hover:bg-[var(--color-check-out-hover)] shadow-[var(--color-check-out)]/20'
              )}
            >
              {isCheckIn ? 'Registrar entrada' : 'Registrar salida'}
            </Button>
          </div>
        </form>
      ) : (
        <div
          className={cn(
            'py-8 text-center',
            status === 'success' ? (isCheckIn ? 'text-emerald-500' : 'text-blue-500') : 'text-red-500',
            isKioskMode && 'py-12'
          )}
        >
          <div
            className={cn(
              'mx-auto rounded-full flex items-center justify-center mb-6',
              isKioskMode ? 'h-32 w-32' : 'h-24 w-24',
              status === 'success'
                ? isCheckIn ? 'bg-emerald-500/10' : 'bg-blue-500/10'
                : 'bg-red-500/10'
            )}
          >
            {status === 'success' ? (
              <CheckCircle className={isKioskMode ? 'h-16 w-16' : 'h-12 w-12'} />
            ) : (
              <XCircle className={isKioskMode ? 'h-16 w-16' : 'h-12 w-12'} />
            )}
          </div>
          <h2 className={cn('font-bold mb-2 text-zinc-900 dark:text-white', isKioskMode ? 'text-4xl' : 'text-3xl')}>
            {status === 'success'
              ? isCheckIn ? 'Acceso concedido' : 'Salida registrada'
              : 'Acceso denegado'}
          </h2>
          <div className="space-y-1">
            <p className={cn('font-semibold text-zinc-900 dark:text-white', isKioskMode ? 'text-2xl' : 'text-xl')}>
              {status === 'success' ? userName : userName || 'Error de validación'}
            </p>
            <p className={cn('text-zinc-500 dark:text-zinc-400', isKioskMode ? 'text-lg' : '')}>{message}</p>
            {durationLabel && (
              <p className="text-sm font-semibold text-blue-500 mt-2">
                Tiempo en gym: {durationLabel}
              </p>
            )}
            {expiryWarning && (
              <p className="text-sm font-semibold text-warning mt-2">{expiryWarning}</p>
            )}
          </div>

          {!isKioskMode && (
            <Button type="button" variant="ghost" className="mt-8" onClick={() => setStatus('idle')}>
              Volver a escanear
            </Button>
          )}
        </div>
      )}
    </>
  );

  if (isKioskMode) {
    return (
      <AuthShell variant="kiosk-fullscreen">
        <div className="flex flex-col min-h-dvh text-white">
          <header className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <Logo className="h-12 w-12" mode="dark" />
              <div>
                <BrandName variant="inline" size="md" onDark className="text-xl" />
                <p className="text-sm text-zinc-400 dark:text-zinc-300">Control de acceso</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl md:text-4xl font-bold font-mono tabular-nums">
                {format(now, 'HH:mm:ss')}
              </p>
              <p className="text-sm text-zinc-400 dark:text-zinc-300 capitalize">
                {format(now, "EEEE d MMM", { locale: es })}
              </p>
            </div>
          </header>

          <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0">
            <section className="flex flex-col justify-center px-6 md:px-12 py-10 border-b lg:border-b-0 lg:border-r border-zinc-800/80">
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
                className="mb-8 max-w-md"
              />
              <div className="max-w-md w-full mx-auto lg:mx-0">{formContent}</div>
            </section>

            <section className="hidden lg:flex flex-col justify-center items-center px-12 py-10 bg-zinc-900/40">
              <div className="text-center max-w-sm">
                <div
                  className={cn(
                    'mx-auto mb-8 rounded-full p-8',
                    isCheckIn ? 'bg-brand/10' : 'bg-[var(--color-check-out)]/10'
                  )}
                >
                  {isCheckIn ? (
                    <LogIn className="h-24 w-24 text-brand mx-auto" />
                  ) : (
                    <LogOut className="h-24 w-24 text-[var(--color-check-out)] mx-auto" />
                  )}
                </div>
                <h2 className="text-3xl font-bold mb-3">
                  {isCheckIn ? '¡Bienvenido!' : '¡Hasta pronto!'}
                </h2>
                <p className="text-zinc-400 dark:text-zinc-300 text-lg leading-relaxed">
                  {isCheckIn
                    ? 'Dicta tu cédula al personal o ingrésala en el teclado para registrar tu entrada.'
                    : 'Registra tu salida al terminar tu entrenamiento.'}
                </p>
                <div className="mt-10 flex items-center justify-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Sistema activo
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    v{APP_VERSION}
                  </span>
                </div>
              </div>
            </section>
          </main>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      variant="kiosk"
      backLink={{ to: '/reception', label: 'Volver a recepción' }}
    >      <AuthBrandHeader subtitle="Control de acceso" size="lg" className="mb-8" />

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

      <Card padding="lg" rounded="2xl" className="shadow-2xl transition-all">
        {formContent}
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
        <Link to="/reception" className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-brand transition-colors">
          Panel de recepción
        </Link>
        <Link to="/check-in?kiosk=1" className="text-xs text-brand hover:text-brand font-semibold">
          Abrir modo tablet
        </Link>      </div>
    </AuthShell>
  );
}
