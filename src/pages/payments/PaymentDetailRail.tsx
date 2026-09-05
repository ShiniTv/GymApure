import { Badge, Button, Card } from '../../components/ui';
import { Check, X } from 'lucide-react';
import { typography } from '../../lib/typography';
import { cn } from '../../lib/utils';
import {
  formatPaymentDate,
  formatPaymentMethod,
  paymentStatusLabel,
  paymentStatusVariant,
  type Payment,
} from './helpers';
import { PaymentRejectionNote } from './PaymentRejectionNote';

interface PaymentDetailRailProps {
  payment: Payment;
  isStaff: boolean;
  onClose: () => void;
  onApprove: (payment: Payment) => void;
  onReject: (payment: Payment) => void;
  onProofPreview: (payment: Payment) => void;
}

export function PaymentDetailRail({
  payment,
  isStaff,
  onClose,
  onApprove,
  onReject,
  onProofPreview,
}: PaymentDetailRailProps) {
  return (
    <Card
      padding="sm"
      rounded="xl"
      className="sticky top-3 hidden max-h-[calc(100vh-6rem)] overflow-y-auto lg:block"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-text truncate text-sm font-semibold">{payment.user_name}</p>
          <p className="text-text-muted text-small">
            <time dateTime={payment.created_at}>{formatPaymentDate(payment.created_at)}</time>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-text-muted hover:bg-surface-overlay hover:text-text inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors"
          aria-label="Cerrar detalle"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className={cn(typography.statValueSm, 'text-brand')}>${payment.amount_usd}</p>
        <Badge variant={paymentStatusVariant(payment.status)} className="text-small">
          {paymentStatusLabel(payment.status)}
        </Badge>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-2">
        <div className="border-border/70 bg-surface-raised/60 rounded-lg border px-2.5 py-2">
          <dt className="text-text-muted text-small font-semibold tracking-wide uppercase">
            Método
          </dt>
          <dd className="text-text mt-0.5 text-xs font-medium capitalize">
            {formatPaymentMethod(payment.method)}
          </dd>
        </div>
        <div className="border-border/70 bg-surface-raised/60 rounded-lg border px-2.5 py-2">
          <dt className="text-text-muted text-small font-semibold tracking-wide uppercase">
            Referencia
          </dt>
          <dd className="text-text mt-0.5 truncate font-mono text-xs font-medium">
            {payment.reference || '—'}
          </dd>
        </div>
      </dl>

      {payment.status === 'rejected' && payment.rejection_reason ? (
        <div className="mt-3">
          <PaymentRejectionNote reason={payment.rejection_reason} />
        </div>
      ) : null}

      {payment.proof_url ? (
        <Button
          type="button"
          variant="secondary"
          className="mt-3 h-10 min-h-10 w-full"
          onClick={() => onProofPreview(payment)}
        >
          Ver comprobante
        </Button>
      ) : null}

      {isStaff && payment.status === 'pending' ? (
        <div className="mt-4 flex flex-col gap-2">
          <Button
            type="button"
            className="h-11 min-h-11 w-full border-emerald-500/35 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
            variant="secondary"
            onClick={() => onApprove(payment)}
          >
            <Check className="h-4 w-4" aria-hidden />
            Aprobar pago
          </Button>
          <Button
            type="button"
            className="border-danger/35 text-danger dark:text-danger h-11 min-h-11 w-full bg-red-500/10 hover:bg-red-500/20"
            variant="secondary"
            onClick={() => onReject(payment)}
          >
            <X className="h-4 w-4" aria-hidden />
            Rechazar pago
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
