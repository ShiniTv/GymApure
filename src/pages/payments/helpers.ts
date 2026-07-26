import { format } from 'date-fns';
import { dateLocale } from '../../lib/dateLocale';

export interface Payment {
  id: number;
  user_name: string;
  amount_usd: number;
  amount_bs: number;
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
  const labels: Record<string, string> = {
    pago_movil: 'Pago móvil',
    transferencia: 'Transferencia',
    zelle: 'Zelle',
    usdt: 'USDT (Binance)',
    efectivo_usd: 'Divisas (USD)',
    efectivo: 'Efectivo',
  };
  return labels[method] ?? method.replace(/_/g, ' ');
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
