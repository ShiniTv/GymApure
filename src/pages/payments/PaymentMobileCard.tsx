import { memo } from 'react';
import { Badge } from '../../components/ui';
import type { Payment } from './helpers';
import {
  formatPaymentDate,
  formatPaymentBsLine,
  formatPaymentMethod,
  isPendingOlderThanDays,
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
  const bsLine = formatPaymentBsLine(payment);
  const stalePending = isPendingOlderThanDays(payment);

  if (!isStaff) {
    return (
      <div className="rounded-xl border border-zinc-200/70 bg-white/80 px-3 py-2.5 dark:border-zinc-800/80 dark:bg-zinc-900/50">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="text-brand text-[15px] leading-none font-bold tabular-nums">
                ${payment.amount_usd}
              </p>
              {bsLine ? (
                <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                  {bsLine}
                </span>
              ) : null}
              <Badge
                variant={paymentStatusVariant(payment.status)}
                className="shrink-0 px-1.5 py-0 text-[9px]"
              >
                {paymentStatusLabel(payment.status)}
              </Badge>
              {stalePending ? (
                <span className="inline-flex rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                  &gt;2 días
                </span>
              ) : null}
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
    <div className="rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-brand text-base leading-none font-bold tabular-nums">
              ${payment.amount_usd}
            </p>
            <Badge
              variant={paymentStatusVariant(payment.status)}
              className="px-1.5 py-0 text-[9px]"
            >
              {paymentStatusLabel(payment.status)}
            </Badge>
            {stalePending ? (
              <span className="inline-flex rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                &gt;2 días
              </span>
            ) : null}
          </div>
          {bsLine ? (
            <p className="mt-1 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{bsLine}</p>
          ) : null}
          <p className="mt-1.5 text-[10px] font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
            Miembro
          </p>
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
            {payment.user_name}
          </p>
          <p className="mt-0.5 truncate text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
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
            className="text-brand hover:bg-brand/10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 transition-colors dark:border-zinc-700"
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
      {showActions && payment.status === 'pending' ? (
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={() => onApprove?.(payment)}
            className="inline-flex h-11 min-h-[var(--touch-min)] flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-500/35 bg-emerald-500/5 px-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400"
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
            Aprobar
          </button>
          <button
            type="button"
            onClick={() => onReject?.(payment)}
            className="inline-flex h-11 min-h-[var(--touch-min)] flex-1 items-center justify-center gap-1 rounded-lg border border-red-500/35 bg-red-500/5 px-2 text-[11px] font-semibold text-red-600 hover:bg-red-500/15 dark:text-red-400"
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
            Rechazar
          </button>
        </div>
      ) : null}
    </div>
  );
});
