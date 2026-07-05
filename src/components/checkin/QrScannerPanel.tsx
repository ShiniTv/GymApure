import { useCallback, useEffect, useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Spinner } from '../ui';
import { ensureQrScannerReady, formatQrScannerError } from '../../lib/qrScannerInit';
import { cn } from '../../lib/utils';

interface QrScannerPanelProps {
  active: boolean;
  paused?: boolean;
  onScan: (rawValue: string) => void;
  className?: string;
}

export function QrScannerPanel({ active, paused = false, onScan, className }: QrScannerPanelProps) {
  const [initState, setInitState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) {
      setInitState('idle');
      setCameraError(null);
      return;
    }

    let cancelled = false;
    setInitState('loading');
    setCameraError(null);

    void ensureQrScannerReady()
      .then(() => {
        if (!cancelled) setInitState('ready');
      })
      .catch(() => {
        if (!cancelled) {
          setInitState('error');
          setCameraError(
            'No se pudo iniciar el lector QR. Use la cédula manual o recargue la página.'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [active]);

  const handleScan = useCallback(
    (detectedCodes: { rawValue: string }[]) => {
      const value = detectedCodes[0]?.rawValue;
      if (value) onScan(value);
    },
    [onScan]
  );

  if (!active) return null;

  const showScanner = initState === 'ready' && !cameraError;

  return (
    <div
      className={cn(
        'border-brand relative overflow-hidden rounded-2xl border-2 bg-zinc-950',
        className
      )}
    >
      {initState === 'loading' && (
        <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-3 p-4 text-center">
          <Spinner size="lg" className="text-zinc-200" />
          <p className="text-sm text-zinc-300">Iniciando lector QR…</p>
        </div>
      )}

      {(initState === 'error' || cameraError) && (
        <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-2 p-4 text-center">
          <p className="text-sm font-medium text-zinc-200">Cámara no disponible</p>
          <p className="text-xs text-zinc-400">{cameraError}</p>
          <p className="text-xs text-zinc-500">Puede ingresar la cédula manualmente abajo.</p>
        </div>
      )}

      {showScanner && (
        <Scanner
          paused={paused}
          allowMultiple={false}
          onScan={handleScan}
          onError={(error) => setCameraError(formatQrScannerError(error?.message ?? ''))}
          constraints={{ facingMode: 'environment' }}
          formats={['qr_code']}
          classNames={{
            container: 'relative h-full w-full min-h-[10rem]',
            video: 'h-full w-full object-cover',
          }}
        />
      )}

      {showScanner && (
        <div
          className="pointer-events-none absolute inset-4 rounded-xl border-2 border-dashed border-white/50"
          aria-hidden
        />
      )}
    </div>
  );
}
