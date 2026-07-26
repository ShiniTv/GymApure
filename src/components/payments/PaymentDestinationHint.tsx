import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import {
  formatDestinationLines,
  PAYMENT_METHOD_LABELS,
  type PaymentDestinations,
  type PaymentMethodKey,
} from '../../lib/paymentDestinationsCore';
import { Button } from '../ui';
import { cn } from '../../lib/utils';

interface PaymentDestinationHintProps {
  method: string;
  destinations: PaymentDestinations | undefined;
  className?: string;
  /** Override when destinations exist but the chosen method has no published details */
  emptyMessage?: string;
}

export function PaymentDestinationHint({
  method,
  destinations,
  className,
  emptyMessage,
}: PaymentDestinationHintProps) {
  const [copied, setCopied] = useState(false);
  if (!destinations) return null;
  if (!(method in PAYMENT_METHOD_LABELS)) return null;
  const key = method as PaymentMethodKey;
  const lines = formatDestinationLines(key, destinations);
  if (lines.length === 0) {
    return (
      <p className={cn('text-text-muted text-[11px] leading-snug', className)}>
        {emptyMessage ??
          `El gimnasio aún no publicó datos de cobro para ${PAYMENT_METHOD_LABELS[key]}.`}
      </p>
    );
  }

  const text = lines.join('\n');

  return (
    <div
      className={cn(
        'border-brand/20 bg-brand/5 rounded-xl border px-3 py-2.5 sm:col-span-2',
        className
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-brand text-[11px] font-bold tracking-wide uppercase">
          Datos para {PAYMENT_METHOD_LABELS[key]}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 min-h-8 px-2 text-[11px]"
          onClick={() => {
            void navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            });
          }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
      <ul className="text-text space-y-0.5 text-[12px] leading-snug">
        {lines.map((line) => (
          <li key={line} className="font-medium">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
