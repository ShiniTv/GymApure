import { describe, expect, it } from 'vitest';
import {
  formatDenominationBreakdown,
  formatDestinationLines,
  normalizePaymentDestinations,
} from '../../src/lib/paymentDestinationsCore.ts';

describe('paymentDestinations', () => {
  it('normaliza JSON parcial con defaults', () => {
    const dest = normalizePaymentDestinations({
      pago_movil: { enabled: true, phone: '04121234567', bank_name: 'BDV' },
    });
    expect(dest.pago_movil.enabled).toBe(true);
    expect(dest.pago_movil.phone).toBe('04121234567');
    expect(dest.transferencia.enabled).toBe(false);
    expect(dest.efectivo_usd.denominations.length).toBeGreaterThan(0);
  });

  it('formatea líneas de transferencia', () => {
    const dest = normalizePaymentDestinations({
      transferencia: {
        enabled: true,
        holder_name: 'Alexis R',
        holder_cedula: 'V-1',
        bank_name: 'Banesco',
        account_type: 'ahorro',
        account_number: '0134…',
      },
    });
    const lines = formatDestinationLines('transferencia', dest);
    expect(lines.some((l) => l.includes('Alexis'))).toBe(true);
    expect(lines.some((l) => l.includes('Ahorro'))).toBe(true);
  });

  it('suma billetes de divisas', () => {
    const { total, label } = formatDenominationBreakdown({ 20: 2, 10: 1, 1: 0 });
    expect(total).toBe(50);
    expect(label).toContain('2×$20');
    expect(label).toContain('1×$10');
  });
});
