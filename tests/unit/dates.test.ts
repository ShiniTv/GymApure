import { describe, expect, it } from 'vitest';
import { formatDateOnly, parseDateOnly } from '../../src/lib/dates.ts';

describe('date-only utilities', () => {
  it('keeps a Postgres DATE on the same local calendar day', () => {
    const parsed = parseDateOnly(' 2026-07-25 ');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(6);
    expect(parsed.getDate()).toBe(25);
    expect(parsed.getHours()).toBe(12);
  });

  it('formats date-only strings without a UTC day shift', () => {
    expect(formatDateOnly('2026-01-03', 'yyyy/MM/dd')).toBe('2026/01/03');
  });

  it('accepts full ISO timestamps', () => {
    expect(parseDateOnly('2026-07-25T18:30:00').getMinutes()).toBe(30);
  });
});
