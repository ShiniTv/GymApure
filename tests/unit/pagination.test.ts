import { describe, expect, it } from 'vitest';
import {
  parseBooleanQuery,
  parsePaginationQuery,
  parseSearchQuery,
} from '../../src/lib/pagination.ts';

describe('pagination helpers', () => {
  it('uses defaults and computes the offset', () => {
    expect(parsePaginationQuery({})).toEqual({ page: 1, pageSize: 20, offset: 0 });
    expect(parsePaginationQuery({ page: '3', limit: '25' })).toEqual({
      page: 3,
      pageSize: 25,
      offset: 50,
    });
  });

  it('clamps invalid and excessive values', () => {
    expect(parsePaginationQuery({ page: '-2', pageSize: '999' }, { maxPageSize: 50 })).toEqual({
      page: 1,
      pageSize: 50,
      offset: 0,
    });
    expect(parsePaginationQuery({ page: 'nope', limit: '0' }, { page: 2, pageSize: 15 })).toEqual({
      page: 2,
      pageSize: 15,
      offset: 15,
    });
  });

  it('normalizes search and boolean query values', () => {
    expect(parseSearchQuery({ q: '  alexis  ' })).toBe('alexis');
    expect(parseSearchQuery({ q: 42 })).toBe('');
    expect([true, 'true', '1'].map(parseBooleanQuery)).toEqual([true, true, true]);
    expect([false, 'false', '0', 1, undefined].map(parseBooleanQuery)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});
