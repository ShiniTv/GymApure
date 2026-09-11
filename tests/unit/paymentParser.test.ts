import { describe, it, expect } from 'vitest';
import { parsePaymentSms } from '../../src/lib/paymentParser';

describe('parsePaymentSms', () => {
  it('handles empty input gracefully', () => {
    expect(parsePaymentSms('')).toEqual({ raw: '' });
    expect(parsePaymentSms('   ')).toEqual({ raw: '' });
  });

  it('parses Banco de Venezuela Pago Móvil SMS correctly', () => {
    const text =
      'PagoMovilBDV: Ha recibido un pago por Bs. 2.450,00 de 04141234567 el 11/09/2026. Ref: 00482910.';
    const parsed = parsePaymentSms(text);
    expect(parsed.bank).toBe('Banco de Venezuela');
    expect(parsed.amountBs).toBe('2450.00');
    expect(parsed.reference).toBe('00482910');
    expect(parsed.phone).toBe('04141234567');
    expect(parsed.date).toBe('11/09/2026');
  });

  it('parses Banesco Pago Móvil SMS correctly', () => {
    const text = 'Banesco Pago Movil por Bs. 1.850,50 a 04127654321 Ref. 88776655 el 10-09-2026';
    const parsed = parsePaymentSms(text);
    expect(parsed.bank).toBe('Banesco');
    expect(parsed.amountBs).toBe('1850.50');
    expect(parsed.reference).toBe('88776655');
    expect(parsed.phone).toBe('04127654321');
  });

  it('parses Mercantil TPago notification correctly', () => {
    const text = 'Mercantil TPago: Recibio Bs. 980,00 Ref: 33445566';
    const parsed = parsePaymentSms(text);
    expect(parsed.bank).toBe('Mercantil');
    expect(parsed.amountBs).toBe('980.00');
    expect(parsed.reference).toBe('33445566');
  });

  it('parses Bancamiga notification correctly', () => {
    const text = 'Bancamiga: Pago movil exitoso Bs 3500.00 Comprobante: 12345678';
    const parsed = parsePaymentSms(text);
    expect(parsed.bank).toBe('Bancamiga');
    expect(parsed.amountBs).toBe('3500.00');
    expect(parsed.reference).toBe('12345678');
  });

  it('parses BBVA Provincial notification correctly', () => {
    const text = 'BBVA Provincial: Pago Movil recibido por Bs. 500,00 Ref: 987654';
    const parsed = parsePaymentSms(text);
    expect(parsed.bank).toBe('BBVA Provincial');
    expect(parsed.amountBs).toBe('500.00');
    expect(parsed.reference).toBe('987654');
  });

  it('falls back to raw numbers if formatted generically', () => {
    const text = 'Transferencia realizada Bs. 1200 Referencia 55443322';
    const parsed = parsePaymentSms(text);
    expect(parsed.amountBs).toBe('1200.00');
    expect(parsed.reference).toBe('55443322');
  });
});
