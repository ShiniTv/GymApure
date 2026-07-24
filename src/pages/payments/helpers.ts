import { format } from 'date-fns';
import { dateLocale } from '../../lib/dateLocale';

export interface Payment {
  id: number;
  user_name: string;
  amount_usd: number;
  amount_bs: number | null;
  exchange_rate?: number | null;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reference: string;
  proof_url?: string | null;
  rejection_reason?: string | null;
}
export function formatPaymentDate(iso: string): string {
  try {
    return format(new Date(iso), 'd MMM yyyy · HH:mm', { locale: dateLocale });
  } catch {
    return iso;
  }
}

export function formatPaymentMethod(method: string): string {
  return method.replace(/_/g, ' ');
}

export function paymentStatusLabel(status: Payment['status']): string {
  if (status === 'approved') return 'Aprobado';
  if (status === 'rejected') return 'Rechazado';
  return 'Pendiente';
}

export function paymentStatusVariant(status: Payment['status']): 'success' | 'danger' | 'warning' {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  return 'warning';
}

export const BS_PAYMENT_METHODS = new Set(['pago_movil', 'transferencia']);

export function formatPaymentBsLine(
  payment: Pick<Payment, 'amount_bs' | 'exchange_rate'>
): string | null {
  if (payment.amount_bs == null) return null;
  const amount = Number(payment.amount_bs);
  if (!Number.isFinite(amount)) return null;

  const rate = payment.exchange_rate == null ? null : Number(payment.exchange_rate);
  const rateLabel =
    rate != null && Number.isFinite(rate) ? ` · Tasa Bs ${rate.toFixed(2)}/USD` : '';
  return `Bs ${amount.toFixed(2)}${rateLabel}`;
}

export function isPdfProofUrl(url?: string | null): boolean {
  return Boolean(url && /\.pdf(?:$|[?#])/i.test(url));
}

export function isPendingOlderThanDays(payment: Payment, days = 2): boolean {
  if (payment.status !== 'pending') return false;
  const createdAt = new Date(payment.created_at).getTime();
  return Number.isFinite(createdAt) && Date.now() - createdAt > days * 24 * 60 * 60 * 1000;
}
