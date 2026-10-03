import { describe, it, expect } from 'vitest';
import { buildBadgeQrValue, parseBadgeScan } from '../../src/lib/badgeQr';

describe('buildBadgeQrValue', () => {
  it('encodes canonical cedula format', () => {
    expect(buildBadgeQrValue('12345678')).toBe('V-12345678');
    expect(buildBadgeQrValue('V-12345678')).toBe('V-12345678');
    expect(buildBadgeQrValue('v12345678')).toBe('V-12345678');
  });

  it('handles foreign prefix correctly', () => {
    expect(buildBadgeQrValue('E-87654321')).toBe('E-87654321');
    expect(buildBadgeQrValue('e87654321')).toBe('E-87654321');
  });

  it('trims whitespace and uppercase non-standard formats', () => {
    expect(buildBadgeQrValue('  j-12345678  ')).toBe('J-12345678');
  });
});

describe('parseBadgeScan', () => {
  it('parses plain canonical cedula scan', () => {
    expect(parseBadgeScan('V-12345678')).toBe('V-12345678');
    expect(parseBadgeScan('12345678')).toBe('V-12345678');
    expect(parseBadgeScan('  v-28491823  ')).toBe('V-28491823');
  });

  it('parses JSON encoded badge payload', () => {
    const payload = JSON.stringify({ cedula: 'V-12345678', v: 1 });
    expect(parseBadgeScan(payload)).toBe('V-12345678');

    const rawNumberPayload = JSON.stringify({ cedula: '28491823' });
    expect(parseBadgeScan(rawNumberPayload)).toBe('V-28491823');
  });

  it('parses URL query params in QR scan', () => {
    expect(parseBadgeScan('https://gym.caribean.com/check-in?cedula=V-12345678')).toBe('V-12345678');
    expect(parseBadgeScan('/check-in?cedula=28491823')).toBe('V-28491823');
  });

  it('returns null on empty, blank, or too short input', () => {
    expect(parseBadgeScan('')).toBeNull();
    expect(parseBadgeScan('   ')).toBeNull();
    expect(parseBadgeScan('123')).toBeNull();
    expect(parseBadgeScan('abc')).toBeNull();
  });

  it('handles malformed JSON gracefully', () => {
    expect(parseBadgeScan('{invalid-json')).toBe('{INVALID-JSON');
  });
});
