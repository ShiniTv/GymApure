export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export type PaymentTransition = { type: 'approve' } | { type: 'reject'; reason: string };

export function canTransitionPayment(
  current: PaymentStatus,
  transition: PaymentTransition
): { ok: true; next: PaymentStatus } | { ok: false; error: string } {
  if (current !== 'pending') {
    return { ok: false, error: 'El pago ya ha sido procesado' };
  }
  if (transition.type === 'approve') {
    return { ok: true, next: 'approved' };
  }
  const reason = transition.reason.trim();
  if (reason.length < 3) {
    return { ok: false, error: 'Indica un motivo de al menos 3 caracteres' };
  }
  return { ok: true, next: 'rejected' };
}
