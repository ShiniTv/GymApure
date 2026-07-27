import { memo, type MouseEvent } from 'react';
import { Check, X } from 'lucide-react';
import { Badge, DataCard, IconButton } from '../../components/ui';
import type { Payment } from './helpers';
import {
  formatPaymentDate,
  formatPaymentMethod,
  paymentStatusVariant,
  paymentStatusLabel,
} from './helpers';
import { PaymentRejectionNote } from './PaymentRejectionNote';
import { ProofPreviewButton } from './ProofPreviewButton';

interface PaymentMobileCardProps {
  payment: Payment;
  isStaff?: boolean;
  showActions?: boolean;
  onApprove?: (payment: Payment) => void;
  onReject?: (payment: Payment) => void;
  onProofPreview?: (payment: Payment) => void;
  onOpenDetail?: (payment: Payment) => void;
}

/** Compact row — mismo lenguaje visual que MemberCardMobile / DataCard. */
export const PaymentMobileCard = memo(function PaymentMobileCard({
  payment,
  isStaff,
  showActions,
  onApprove,
  onReject,
  onProofPreview,
  onOpenDetail,
}: PaymentMobileCardProps) {
  const pending = Boolean(showActions && payment.status === 'pending');
  const stopAnd = (fn?: (payment: Payment) => void) => (e: MouseEvent) => {
    e.stopPropagation();
    fn?.(payment);
  };

  if (!isStaff) {
    return (
      <DataCard className="!space-y-0 !p-2.5 sm:!p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="text-brand text-[15px] leading-none font-bold tabular-nums">
                ${payment.amount_usd}
              </p>
              <Badge
                variant={paymentStatusVariant(payment.status)}
                className="shrink-0 px-1.5 py-0 text-[9px]"
              >
                {paymentStatusLabel(payment.status)}
              </Badge>
            </div>
            <p className="text-text-secondary mt-1 truncate text-[11px] leading-snug">
              {formatPaymentMethod(payment.method)}
              <span className="text-text-muted mx-1.5">·</span>
              <time dateTime={payment.created_at}>{formatPaymentDate(payment.created_at)}</time>
            </p>
            {payment.reference ? (
              <p
                className="text-text-muted mt-0.5 truncate font-mono text-[10px]"
                title={payment.reference}
              >
                {payment.reference}
              </p>
            ) : null}
            {payment.status === 'rejected' ? (
              <PaymentRejectionNote reason={payment.rejection_reason} />
            ) : null}
          </div>
          {payment.proof_url ? (
            <ProofPreviewButton
              onClick={() => onProofPreview?.(payment)}
              className="border-border/70 h-8 w-8"
            />
          ) : null}
        </div>
      </DataCard>
    );
  }

  return (
    <DataCard
      className="!space-y-0 !p-2.5 sm:!p-3"
      onClick={onOpenDetail ? () => onOpenDetail(payment) : undefined}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="min-w-0 flex-1 text-left">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="text-text min-w-0 flex-1 truncate text-[13px] leading-tight font-semibold">
              {payment.user_name}
            </p>
            <Badge
              variant={paymentStatusVariant(payment.status)}
              className="shrink-0 px-1.5 py-0 text-[9px]"
            >
              {paymentStatusLabel(payment.status)}
            </Badge>
          </div>
          <p className="text-text-secondary mt-0.5 truncate text-[11px] leading-snug">
            <span className="text-brand font-semibold tabular-nums">${payment.amount_usd}</span>
            <span className="text-text-muted mx-1.5">·</span>
            <span>{formatPaymentMethod(payment.method)}</span>
            <span className="text-text-muted mx-1.5">·</span>
            <time dateTime={payment.created_at}>{formatPaymentDate(payment.created_at)}</time>
          </p>
          {payment.reference ? (
            <p
              className="text-text-muted mt-0.5 truncate font-mono text-[10px]"
              title={payment.reference}
            >
              {payment.reference}
            </p>
          ) : null}
          {payment.status === 'rejected' ? (
            <PaymentRejectionNote reason={payment.rejection_reason} />
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {payment.proof_url ? (
            <ProofPreviewButton
              onClick={stopAnd(onProofPreview)}
              className="border-border/70 h-8 w-8"
            />
          ) : null}
          {pending ? (
            <>
              <IconButton
                size="sm"
                variant="secondary"
                className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                aria-label="Aprobar pago"
                title="Aprobar"
                onClick={stopAnd(onApprove)}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.25} />
              </IconButton>
              <IconButton
                size="sm"
                variant="danger"
                aria-label="Rechazar pago"
                title="Rechazar"
                onClick={stopAnd(onReject)}
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.25} />
              </IconButton>
            </>
          ) : null}
        </div>
      </div>
    </DataCard>
  );
});
