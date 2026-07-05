import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Spinner } from '../ui';
import { formatQrScannerError } from '../../lib/qrScannerErrors';
import { cn } from '../../lib/utils';

interface QrScannerPanelProps {
  active: boolean;
  paused?: boolean;
  onScan: (rawValue: string) => void;
  className?: string;
}

function getQrBoxSize(): number {
  if (typeof window === 'undefined') return 250;
  return Math.min(280, Math.max(200, Math.floor(window.innerWidth * 0.7)));
}

export function QrScannerPanel({ active, paused = false, onScan, className }: QrScannerPanelProps) {
  const regionId = useId().replace(/:/g, '');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const pausedRef = useRef(paused);
  const [initState, setInitState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);

  onScanRef.current = onScan;
  pausedRef.current = paused;

  useEffect(() => {
    if (!active) {
      setInitState('idle');
      setCameraError(null);
      return;
    }

    let cancelled = false;
    setInitState('loading');
    setCameraError(null);

    const scanner = new Html5Qrcode(regionId, {
      verbose: false,
      useBarCodeDetectorIfSupported: false,
    });
    scannerRef.current = scanner;
    const qrbox = getQrBoxSize();

    void scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: qrbox, height: qrbox },
          aspectRatio: 1,
          disableFlip: true,
        },
        (decodedText) => {
          if (pausedRef.current) return;
          onScanRef.current(decodedText);
        },
        () => {
          // Ignorar frames sin detección
        }
      )
      .then(() => {
        if (!cancelled) setInitState('ready');
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setInitState('error');
          const message = err instanceof Error ? err.message : String(err);
          setCameraError(formatQrScannerError(message));
        }
      });

    return () => {
      cancelled = true;
      const instance = scannerRef.current;
      scannerRef.current = null;
      if (!instance) return;
      void instance
        .stop()
        .then(() => instance.clear())
        .catch(() => {
          instance.clear();
        });
    };
  }, [active, regionId]);

  if (!active) return null;

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
          <p className="text-sm text-zinc-300">Iniciando cámara…</p>
        </div>
      )}

      {(initState === 'error' || cameraError) && (
        <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-2 p-4 text-center">
          <p className="text-sm font-medium text-zinc-200">Cámara no disponible</p>
          <p className="text-xs text-zinc-400">{cameraError}</p>
          <p className="text-xs text-zinc-500">Puede ingresar la cédula manualmente abajo.</p>
        </div>
      )}

      <div
        id={regionId}
        className={cn(
          'min-h-[10rem] w-full',
          initState !== 'ready' &&
            'pointer-events-none absolute h-0 min-h-0 overflow-hidden opacity-0'
        )}
      />

      {initState === 'ready' && !cameraError && (
        <div
          className="pointer-events-none absolute inset-4 rounded-xl border-2 border-dashed border-white/50"
          aria-hidden
        />
      )}
    </div>
  );
}
