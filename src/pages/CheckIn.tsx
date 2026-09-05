import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { apiFetch, parseJsonSafe } from '../lib/api';
import { CheckCircle, XCircle, LogIn, LogOut, Clock, ChevronDown, ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { format } from 'date-fns';
import { dateLocale as es } from '../lib/dateLocale';
import { APP_VERSION } from '../lib/appVersion';
import AuthShell from '../components/AuthShell';
import AuthBrandHeader from '../components/AuthBrandHeader';
import BrandName from '../components/BrandName';
import Logo from '../components/Logo';
import { Button, Card, SegmentedControl, Spinner, CedulaInput } from '../components/ui';
import { parseBadgeScan } from '../lib/badgeQr';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { cn } from '../lib/utils';
import { usePageTitle } from '../hooks/usePageTitle';

const QrScannerPanel = lazy(() =>
  import('../components/checkin/QrScannerPanel').then((m) => ({ default: m.QrScannerPanel }))
);
type KioskMode = 'check-in' | 'check-out';

export default function CheckIn() {
  usePageTitle('Acceso');
  const [searchParams] = useSearchParams();
  const isKioskMode = searchParams.get('kiosk') === '1';
  const { isDesktop: isLargeKioskLayout } = useBreakpoint();
  const isMobileKiosk = isKioskMode && !isLargeKioskLayout;

  const [mode, setMode] = useState<KioskMode>('check-in');
  const [cedula, setCedula] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [expiryWarning, setExpiryWarning] = useState('');
  const [durationLabel, setDurationLabel] = useState('');
  const [userName, setUserName] = useState('');
  const [now, setNow] = useState(new Date());
  const [showManualCedula, setShowManualCedula] = useState(false);
  const cedulaRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);

  const isCheckIn = mode === 'check-in';
  const scannerActive = status === 'idle';

  const handleNextVisitor = useCallback(() => {
    processingRef.current = false;
    setStatus('idle');
    setCedula('');
    setMessage('');
    setExpiryWarning('');
    setDurationLabel('');
    setUserName('');
    setShowManualCedula(false);
  }, []);

  const resetToIdle = useCallback((delayMs: number) => {
    setTimeout(() => {
      processingRef.current = false;
      setStatus('idle');
      setExpiryWarning('');
      setDurationLabel('');
      cedulaRef.current?.focus();
    }, delayMs);
  }, []);

  const processCheck = useCallback(
    (rawInput: string) => {
      if (processingRef.current) return;

      const parsedCedula = parseBadgeScan(rawInput);
      if (!parsedCedula) {
        setStatus('error');
        setMessage('Código QR o cédula no reconocido');
        setExpiryWarning('');
        processingRef.current = false;
        resetToIdle(4000);
        return;
      }

      processingRef.current = true;
      setCedula(parsedCedula);
      setStatus('scanning');
      setDurationLabel('');

      const started = Date.now();
      const endpoint = isCheckIn ? '/api/reception/check-in' : '/api/reception/check-out';

      const finishScan = async () => {
        try {
          const res = await apiFetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cedula: parsedCedula }),
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
            processingRef.current = false;
            resetToIdle(isKioskMode ? 3500 : 4500);
          } else {
            setStatus('error');
            setMessage(data.error || (isCheckIn ? 'Ingreso fallido' : 'Salida fallida'));
            setExpiryWarning('');
            if (data.user_name) setUserName(data.user_name);
            processingRef.current = false;
            resetToIdle(isKioskMode ? 4000 : 4000);
          }
        } catch {
          setStatus('error');
          setMessage('Error de red');
          processingRef.current = false;
          resetToIdle(isKioskMode ? 4000 : 4000);
        }
      };

      const minDelay = 600;
      const elapsed = Date.now() - started;
      const wait = Math.max(0, minDelay - elapsed);
      setTimeout(() => {
        void finishScan();
      }, wait);
    },
    [isCheckIn, isKioskMode, resetToIdle]
  );

  const handleQrScan = useCallback(
    (rawValue: string) => {
      if (status !== 'idle' || processingRef.current) return;
      void processCheck(rawValue);
    },
    [processCheck, status]
  );

  useEffect(() => {
    if (!isKioskMode) return;
    const tick = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(tick);
  }, [isKioskMode]);

  useEffect(() => {
    if (status === 'idle' && !isKioskMode) {
      cedulaRef.current?.focus();
    }
  }, [status, mode, isKioskMode]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cedula.trim() || status !== 'idle') return;
    void processCheck(cedula);
  };

  const cedulaField = (
    <CedulaInput
      ref={cedulaRef}
      variant={isKioskMode ? 'kiosk' : 'default'}
      value={cedula}
      onChange={setCedula}
      disabled={status === 'scanning'}
      preventMobileKeyboard={isKioskMode && !isMobileKiosk}
      kioskSize={isMobileKiosk ? 'compact' : 'default'}
      className={!isKioskMode ? 'py-2.5 text-base sm:text-lg' : undefined}
    />
  );

  const submitButton = (
    <Button
      type="submit"
      size="lg"
      loading={status === 'scanning'}
      disabled={!cedula.trim()}
      className={cn(
        'w-full',
        isKioskMode && 'min-h-[64px] text-lg',
        !isCheckIn && 'bg-[var(--color-check-out)] hover:bg-[var(--color-check-out-hover)]'
      )}
    >
      {isCheckIn ? 'Registrar entrada' : 'Registrar salida'}
    </Button>
  );

  const formContent = (
    <>
      {status === 'idle' || status === 'scanning' ? (
        <form
          onSubmit={handleSubmit}
          className={cn(isKioskMode ? (isMobileKiosk ? 'space-y-5' : 'space-y-10') : 'space-y-4')}
        >
          <div className="space-y-4 text-center">
            {isKioskMode && !isLargeKioskLayout ? (
              <Suspense
                fallback={
                  <div className="mx-auto flex h-[200px] max-w-sm items-center justify-center">
                    <Spinner size="lg" />
                  </div>
                }
              >
                <QrScannerPanel
                  active={scannerActive}
                  paused={status !== 'idle'}
                  onScan={handleQrScan}
                  className="kiosk-scanner-region mx-auto max-h-[40dvh] min-h-[200px] w-full max-w-sm"
                />
              </Suspense>
            ) : !isKioskMode ? (
              <div
                className={cn(
                  'relative mx-auto flex items-center justify-center overflow-hidden rounded-[var(--radius-card)] border-2 transition-all',
                  'h-32 w-32',
                  status === 'scanning'
                    ? isCheckIn
                      ? 'border-brand ring-brand/20 ring-2'
                      : 'border-[var(--color-check-out)] ring-2 ring-[var(--color-check-out)]/20'
                    : 'border-border'
                )}
              >
                {status === 'scanning' && (
                  <div
                    className={cn(
                      'animate-scan-line absolute inset-0',
                      isCheckIn
                        ? 'from-brand/20 bg-gradient-to-t to-transparent'
                        : 'bg-gradient-to-t from-[var(--color-check-out)]/20 to-transparent'
                    )}
                  />
                )}
                {status === 'scanning' ? (
                  <Spinner size="xl" className="relative z-10" />
                ) : isCheckIn ? (
                  <LogIn className="text-brand/40 h-16 w-16" />
                ) : (
                  <LogOut className="h-16 w-16 text-[var(--color-check-out)]/40" />
                )}
              </div>
            ) : null}
            <div>
              <h2
                className={cn(
                  'text-text font-semibold',
                  isKioskMode ? (isMobileKiosk ? 'text-xl' : 'text-2xl') : 'text-lg'
                )}
              >
                {status === 'scanning'
                  ? 'Verificando…'
                  : isCheckIn
                    ? 'Registro de entrada'
                    : 'Registro de salida'}
              </h2>
              <p
                className={cn(
                  'text-text-muted mt-1',
                  isKioskMode ? (isMobileKiosk ? 'text-sm' : 'text-base') : 'text-sm'
                )}
              >
                {isKioskMode
                  ? isCheckIn
                    ? 'Escanee el QR (carné impreso o “Mostrar QR para escaneo” en Perfil). Suba el brillo si usa pantalla de celular.'
                    : 'Escanee el carné o ingrese su cédula. Si usa pantalla de celular, suba el brillo al máximo.'
                  : isCheckIn
                    ? 'Ingrese su cédula para registrar la entrada'
                    : 'Ingrese su cédula para registrar la salida'}
              </p>
            </div>
          </div>

          {isMobileKiosk ? (
            <div className="space-y-3">
              {!showManualCedula ? (
                <button
                  type="button"
                  onClick={() => setShowManualCedula(true)}
                  className="border-border bg-surface-raised text-text hover:bg-surface-overlay flex min-h-[var(--touch-min)] w-full touch-manipulation items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors"
                >
                  Ingresar cédula manualmente
                  <ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
                </button>
              ) : (
                <div className="space-y-4">
                  {cedulaField}
                  {cedula.trim() ? submitButton : null}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {cedulaField}
              {submitButton}
            </div>
          )}
        </form>
      ) : (
        <div
          className={cn(
            'py-8 text-center',
            status === 'success'
              ? isCheckIn
                ? 'text-success'
                : 'text-[var(--color-check-out)]'
              : 'text-danger',
            isKioskMode && (isMobileKiosk ? 'py-6' : 'py-12'),
            status === 'success' && 'animate-success-pop'
          )}
        >
          <div
            className={cn(
              'mx-auto mb-6 flex items-center justify-center rounded-full',
              isKioskMode ? (isMobileKiosk ? 'h-24 w-24' : 'h-32 w-32') : 'h-24 w-24',
              status === 'success'
                ? isCheckIn
                  ? 'bg-success/10'
                  : 'bg-[var(--color-check-out)]/10'
                : 'bg-danger/10'
            )}
          >
            {status === 'success' ? (
              <CheckCircle className={isKioskMode && !isMobileKiosk ? 'h-16 w-16' : 'h-12 w-12'} />
            ) : (
              <XCircle className={isKioskMode && !isMobileKiosk ? 'h-16 w-16' : 'h-12 w-12'} />
            )}
          </div>
          <h2
            className={cn(
              'text-text mb-2 font-semibold',
              isKioskMode ? (isMobileKiosk ? 'text-2xl' : 'text-4xl') : 'text-3xl'
            )}
          >
            {status === 'success'
              ? isCheckIn
                ? 'Acceso concedido'
                : 'Salida registrada'
              : 'Acceso denegado'}
          </h2>
          <div className="space-y-1">
            <p
              className={cn(
                'text-text font-semibold',
                isKioskMode ? (isMobileKiosk ? 'text-lg' : 'text-2xl') : 'text-xl'
              )}
            >
              {status === 'success' ? userName : userName || 'Error de validación'}
            </p>
            <p className={cn('text-text-muted', isKioskMode && !isMobileKiosk ? 'text-lg' : '')}>
              {message}
            </p>
            {durationLabel && (
              <p className="mt-2 text-sm font-semibold text-[var(--color-check-out)]">
                Tiempo en gym: {durationLabel}
              </p>
            )}
            {expiryWarning && (
              <p className="text-warning mt-2 text-sm font-semibold">{expiryWarning}</p>
            )}
          </div>

          {isKioskMode ? (
            <div
              className={cn(
                'mt-8',
                isMobileKiosk &&
                  'border-border bg-bg sticky bottom-0 -mx-4 border-t px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]'
              )}
            >
              <Button
                type="button"
                size="lg"
                className="min-h-[56px] w-full text-lg"
                onClick={handleNextVisitor}
              >
                Siguiente visitante
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="secondary"
              className={cn(isKioskMode ? 'mt-8' : 'mt-4')}
              onClick={() => setStatus('idle')}
            >
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
        <div className="dark bg-bg text-text flex min-h-dvh flex-col">
          <header
            className={cn(
              'border-border bg-bg relative flex shrink-0 items-center justify-between border-b',
              isLargeKioskLayout ? 'px-6 py-5 md:px-10' : 'px-4 py-3'
            )}
          >
            <Link
              to="/reception"
              className="text-text-muted hover:text-text text-small absolute top-3 left-4 z-10 inline-flex items-center gap-1 transition-colors sm:left-6 sm:text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver a recepción
            </Link>
            <div className="flex min-w-0 items-center gap-3 pt-5 sm:pt-0">
              <Logo
                className={cn('shrink-0', isLargeKioskLayout ? 'h-12 w-12' : 'h-9 w-9')}
                mode="dark"
              />
              <div className="min-w-0">
                <BrandName
                  variant="inline"
                  size="md"
                  onDark
                  className={cn(isLargeKioskLayout ? 'text-xl' : 'text-base')}
                />
                <p className="text-text-muted truncate text-xs sm:text-sm">Control de acceso</p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p
                className={cn(
                  'font-mono font-bold tabular-nums',
                  isLargeKioskLayout ? 'text-3xl md:text-4xl' : 'text-2xl'
                )}
              >
                {format(now, 'HH:mm:ss')}
              </p>
              <p className="text-text-muted hidden text-sm capitalize sm:block">
                {format(now, 'EEEE d MMM', { locale: es })}
              </p>
            </div>
          </header>

          <main
            className={cn(
              'grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-2',
              !isLargeKioskLayout && 'overflow-hidden'
            )}
          >
            <section
              className={cn(
                'border-border/80 flex flex-col border-b lg:border-r lg:border-b-0',
                isLargeKioskLayout
                  ? 'justify-center px-6 py-10 md:px-12'
                  : 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-[env(safe-area-inset-bottom)]'
              )}
            >
              <SegmentedControl
                variant="kiosk"
                fullWidth
                value={mode}
                onChange={(next) => {
                  setMode(next);
                  handleNextVisitor();
                }}
                options={[
                  { value: 'check-in', label: 'Entrada', icon: LogIn, accent: 'brand' },
                  { value: 'check-out', label: 'Salida', icon: LogOut, accent: 'check-out' },
                ]}
                className={cn('mb-8 max-w-md', isMobileKiosk && 'mb-5')}
              />
              <div className="mx-auto w-full max-w-md lg:mx-0">{formContent}</div>
            </section>
            <section className="bg-surface-raised hidden flex-col items-center justify-center px-12 py-10 lg:flex">
              <div className="w-full max-w-md space-y-6">
                <Suspense
                  fallback={
                    <div className="bg-surface-overlay flex h-72 w-full items-center justify-center rounded-[var(--radius-card)]">
                      <Spinner size="lg" />
                    </div>
                  }
                >
                  <QrScannerPanel
                    active={scannerActive}
                    paused={status !== 'idle'}
                    onScan={handleQrScan}
                    className="h-72 w-full"
                  />
                </Suspense>
                <div className="text-center">
                  <h2 className="mb-2 text-2xl font-bold">
                    {isCheckIn ? 'Escanee su carné' : 'Escanee para salir'}
                  </h2>
                  <p className="text-text-muted text-base leading-relaxed">
                    {isCheckIn
                      ? 'Apunte la cámara al QR del carné. En celular, el miembro debe usar “Mostrar QR para escaneo” con brillo al máximo.'
                      : 'Escanee el mismo código QR para registrar su salida.'}
                  </p>
                </div>
                <div className="text-text-muted flex items-center justify-center gap-6 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="bg-success h-2 w-2 rounded-full" />
                    Sistema activo
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />v{APP_VERSION}
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
    <AuthShell variant="kiosk" backLink={{ to: '/reception', label: 'Volver a recepción' }}>
      <AuthBrandHeader subtitle="Control de acceso" size="lg" className="mb-4 sm:mb-6" />
      <SegmentedControl
        variant="compact"
        className="mb-4 w-fit max-w-full sm:mb-6"
        value={mode}
        onChange={(next) => {
          setMode(next);
          setStatus('idle');
        }}
        options={[
          { value: 'check-in', label: 'Entrada', icon: LogIn, accent: 'brand' },
          { value: 'check-out', label: 'Salida', icon: LogOut, accent: 'check-out' },
        ]}
      />
      <Card padding="md" rounded="xl">
        {formContent}
      </Card>
      <div className="mt-4 flex flex-col items-center gap-3 sm:mt-6">
        <div className="flex justify-center gap-6">
          <div className="text-text-muted flex items-center gap-2 text-xs">
            <span className="bg-success h-2 w-2 rounded-full" />
            Sistema activo
          </div>
          <div className="text-text-muted flex items-center gap-2 text-xs">
            <span className="bg-text-muted/50 h-2 w-2 rounded-full" />v{APP_VERSION}
          </div>
        </div>
        <Link
          to="/reception"
          className="hover:text-brand text-text-muted text-xs transition-colors"
        >
          Panel de recepción
        </Link>
        <Link to="/check-in?kiosk=1" className="text-brand hover:text-brand text-xs font-semibold">
          Abrir modo tablet
        </Link>
      </div>
    </AuthShell>
  );
}
