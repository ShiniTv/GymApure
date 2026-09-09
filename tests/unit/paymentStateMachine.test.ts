import { describe, expect, it } from 'vitest';
import { canTransitionPayment } from '../../src/lib/paymentStateMachine.ts';

describe('paymentStateMachine', () => {
  it('approves pending payments', () => {
    expect(canTransitionPayment('pending', { type: 'approve' })).toEqual({
      ok: true,
      next: 'approved',
    });
  });

  it('rejects pending with valid reason', () => {
    expect(canTransitionPayment('pending', { type: 'reject', reason: 'Comprobante ilegible' })).toEqual({
      ok: true,
      next: 'rejected',
    });
  });

  it('blocks reject with short reason', () => {
    const result = canTransitionPayment('pending', { type: 'reject', reason: 'no' });
    expect(result.ok).toBe(false);
  });

  it('blocks transitions from approved/rejected', () => {
    expect(canTransitionPayment('approved', { type: 'approve' }).ok).toBe(false);
    expect(canTransitionPayment('rejected', { type: 'reject', reason: 'otro motivo' }).ok).toBe(
      false
    );
  });
});
