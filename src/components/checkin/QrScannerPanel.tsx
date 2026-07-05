import { useCallback, useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { cn } from '../../lib/utils';

interface QrScannerPanelProps {
  active: boolean;
  paused?: boolean;
  onScan: (rawValue: string) => void;
  className?: string;
}

export function QrScannerPanel({ active, paused = false, onScan, className }: QrScannerPanelProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);

  const handleScan = useCallback(
    (detectedCodes: { rawValue: string }[]) => {
      const value = detectedCodes[0]?.rawValue;
      if (value) onScan(value);
    },
    [onScan]
  );

  if (!active) return null;

  return (
    <div
      className={cn(
        'border-brand relative overflow-hidden rounded-2xl border-2 bg-zinc-950',
        className
      )}
    >
      {cameraError ? (
        <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-2 p-4 text-center">
          <p className="text-sm font-medium text-zinc-200">Cámara no disponible</p>
          <p className="text-xs text-zinc-400">{cameraError}</p>
          <p className="text-xs text-zinc-500">Puede ingresar la cédula manualmente abajo.</p>
        </div>
      ) : (
        <Scanner
          paused={paused}
          allowMultiple={false}
          onScan={handleScan}
          onError={(error) =>
            setCameraError(error?.message ?? 'No se pudo acceder a la cámara. Use el teclado.')
          }
          constraints={{ facingMode: 'environment' }}
          formats={['qr_code']}
          classNames={{
            container: 'relative h-full w-full min-h-[10rem]',
            video: 'h-full w-full object-cover',
          }}
        />
      )}
      {!cameraError && (
        <div
          className="pointer-events-none absolute inset-4 rounded-xl border-2 border-dashed border-white/50"
          aria-hidden
        />
      )}
    </div>
  );
}
