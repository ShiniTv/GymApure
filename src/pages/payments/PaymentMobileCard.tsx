import { memo } from 'react';
import { Badge } from '../../components/ui';
import type { Payment } from './helpers';
import {
  formatPaymentDate,
  formatPaymentMethod,
  paymentStatusVariant,
  paymentStatusLabel,
} from './helpers';
import { PaymentRejectionNote } from './PaymentRejectionNote';

interface PaymentMobileCardProps {
  payment: Payment;
  isStaff?: boolean;
  showActions?: boolean;
  onApprove?: (payment: Payment) => void;
  onReject?: (payment: Payment) => void;
  onProofPreview?: (payment: Payment) => void;
}

export const PaymentMobileCard = memo(function PaymentMobileCard({
  payment,
  isStaff,
  showActions,
  onApprove,
  onReject,
  onProofPreview,
}: PaymentMobileCardProps) {
  if (!isStaff) {
    return (
      <div className="rounded-xl border border-zinc-200/70 bg-white/80 px-3 py-2.5 dark:border-zinc-800/80 dark:bg-zinc-900/50">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
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
            <p className="mt-1 truncate text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
              <time dateTime={payment.created_at}>{formatPaymentDate(payment.created_at)}</time>
              <span className="mx-1 text-zinc-300 dark:text-zinc-600">·</span>
              <span className="capitalize">{formatPaymentMethod(payment.method)}</span>
            </p>
            {payment.reference ? (
              <p
                className="mt-0.5 truncate font-mono text-[10px] text-zinc-400 dark:text-zinc-500"
                title={payment.reference}
              >
                Ref. {payment.reference}
              </p>
            ) : null}
            {payment.status === 'rejected' ? (
              <PaymentRejectionNote reason={payment.rejection_reason} />
            ) : null}
          </div>
          {payment.proof_url ? (
            <button
              type="button"
              onClick={() => onProofPreview?.(payment)}
              className="text-brand hover:bg-brand/10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors"
              aria-label="Ver comprobante"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M4 4h16v16H4z" />
                <circle cx="12" cy="12" r="3" />
                <path d="M2 12h3M19 12h3" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2.5">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
            {payment.user_name}
          </p>
          <p className="text-brand mt-0.5 text-base leading-none font-bold tabular-nums">
            ${payment.amount_usd}
          </p>
          <p className="mt-1 truncate text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
            <time dateTime={payment.created_at}>{formatPaymentDate(payment.created_at)}</time>
            <span className="mx-1 text-zinc-300 dark:text-zinc-600">·</span>
            <span className="capitalize">{formatPaymentMethod(payment.method)}</span>
            {payment.reference && (
              <>
                <span className="mx-1 text-zinc-300 dark:text-zinc-600">·</span>
                <span className="font-mono" title={payment.reference}>
                  Ref: {payment.reference}
                </span>
              </>
            )}
          </p>
          {payment.status === 'rejected' && (
            <PaymentRejectionNote reason={payment.rejection_reason} />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {showActions && payment.status === 'pending' && (
            <>
              <button
                type="button"
                onClick={() => onApprove?.(payment)}
                className="inline-flex min-h-[var(--touch-min)] min-w-[var(--touch-min)] items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-500/10"
                aria-label="Aprobar pago"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span className="sr-only sm:not-sr-only">Aprobar</span>
              </button>
              <button
                type="button"
                onClick={() => onReject?.(payment)}
                className="inline-flex min-h-[var(--touch-min)] min-w-[var(--touch-min)] items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-red-500 hover:bg-red-500/10"
                aria-label="Rechazar pago"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                <span className="sr-only sm:not-sr-only">Rechazar</span>
              </button>
            </>
          )}
          {payment.proof_url && (
            <button
              type="button"
              onClick={() => onProofPreview?.(payment)}
              className="text-brand hover:bg-brand/10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 transition-colors dark:border-zinc-700"
              aria-label="Ver comprobante"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M4 4h16v16H4z" />
                <circle cx="12" cy="12" r="3" />
                <path d="M2 12h3M19 12h3" />
              </svg>
            </button>
          )}
          <Badge
            variant={paymentStatusVariant(payment.status)}
            className="shrink-0 px-1.5 py-0 text-[9px]"
          >
            {paymentStatusLabel(payment.status)}
          </Badge>
        </div>
      </div>
    </div>
  );
});
