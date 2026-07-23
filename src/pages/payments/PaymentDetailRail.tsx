import { Badge, Button, Card } from '../../components/ui';
import { Check, X } from 'lucide-react';
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
          <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">
            {payment.user_name}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            <time dateTime={payment.created_at}>{formatPaymentDate(payment.created_at)}</time>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Cerrar detalle"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-brand text-xl font-bold tabular-nums">${payment.amount_usd}</p>
        <Badge variant={paymentStatusVariant(payment.status)} className="text-[10px]">
          {paymentStatusLabel(payment.status)}
        </Badge>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-2">
        <div className="rounded-lg border border-zinc-100 bg-zinc-50/70 px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-900/40">
          <dt className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Método
          </dt>
          <dd className="mt-0.5 text-xs font-medium text-zinc-900 capitalize dark:text-zinc-100">
            {formatPaymentMethod(payment.method)}
          </dd>
        </div>
        <div className="rounded-lg border border-zinc-100 bg-zinc-50/70 px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-900/40">
          <dt className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Referencia
          </dt>
          <dd className="mt-0.5 truncate font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100">
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
            variant="ghost"
            onClick={() => onApprove(payment)}
          >
            <Check className="h-4 w-4" aria-hidden />
            Aprobar pago
          </Button>
          <Button
            type="button"
            className="h-11 min-h-11 w-full border-red-500/35 bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400"
            variant="ghost"
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
