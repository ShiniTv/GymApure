import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/ui';
import { cn } from '../../lib/utils';
import type { Payment } from './helpers';
import { formatPaymentDate, formatPaymentMethod, paymentStatusVariant, paymentStatusLabel } from './helpers';

interface PaymentMobileCardProps {
  payment: Payment;
  isStaff?: boolean;
  showActions?: boolean;
  onApprove?: (payment: Payment) => void;
  onReject?: (payment: Payment) => void;
  onProofPreview?: (payment: Payment) => void;
  onProofPreviewBtn?: (payment: Payment) => void;
}

export const PaymentMobileCard = memo(function PaymentMobileCard({
  payment,
  isStaff,
  showActions,
  onApprove,
  onReject,
  onProofPreview,
}: PaymentMobileCardProps) {
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          {isStaff && (
            <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate">
              {payment.user_name}
            </p>
          )}
          <p className={cn('font-bold text-brand tabular-nums leading-none', isStaff ? 'mt-0.5 text-base' : 'text-base sm:text-lg')}>
            ${payment.amount_usd}
          </p>
          <p className="mt-1 text-[10px] leading-snug text-zinc-500 truncate">
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
            <p className="mt-1 text-[10px] leading-snug text-red-500/90">
              Comprobante no verificado.{' '}
              <Link to="/messages" className="font-semibold underline hover:text-red-400">
                Consulta Mensajes
              </Link>
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {showActions && payment.status === 'pending' && (
            <>
              <button
                type="button"
                onClick={() => onApprove?.(payment)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-500/10"
                aria-label="Aprobar pago"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
              </button>
              <button
                type="button"
                onClick={() => onReject?.(payment)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10"
                aria-label="Rechazar pago"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </>
          )}
          {payment.proof_url && (
            <button
              type="button"
              onClick={() => onProofPreview?.(payment)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-brand hover:bg-brand/10 transition-colors"
              aria-label="Ver comprobante"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z"/><circle cx="12" cy="12" r="3"/><path d="M2 12h3M19 12h3"/></svg>
            </button>
          )}
          <Badge variant={paymentStatusVariant(payment.status)} className="text-[9px] px-1.5 py-0 shrink-0">
            {paymentStatusLabel(payment.status)}
          </Badge>
        </div>
      </div>
    </div>
  );
});
