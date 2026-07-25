import { describe, expect, it } from 'vitest';
import { parseNonNegativeInt, parsePositiveInt } from '../../src/lib/parseFormNumber.ts';

describe('form number parsers', () => {
  it('parses integers and falls back for invalid positive values', () => {
    expect(parsePositiveInt('12', 3)).toBe(12);
    expect(parsePositiveInt('12.9', 3)).toBe(12);
    expect(parsePositiveInt('0', 3)).toBe(3);
    expect(parsePositiveInt('-1', 3)).toBe(3);
    expect(parsePositiveInt('not-a-number', 3)).toBe(3);
  });

  it('allows zero only for non-negative values', () => {
    expect(parseNonNegativeInt('0', 5)).toBe(0);
    expect(parseNonNegativeInt('8', 5)).toBe(8);
    expect(parseNonNegativeInt('-1', 5)).toBe(5);
  });
});
