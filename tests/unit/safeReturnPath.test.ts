import { describe, it, expect } from 'vitest';
import { safeReturnPath } from '../../src/lib/safeReturnPath';

describe('safeReturnPath', () => {
  it('returns default role route when from is missing or empty', () => {
    expect(safeReturnPath(null, 'member')).toBe('/panel');
    expect(safeReturnPath(undefined, 'admin')).toBe('/panel');
    expect(safeReturnPath('', 'trainer')).toBe('/panel');
    expect(safeReturnPath('   ', 'receptionist')).toBe('/reception');
  });

  it('allows safe relative application paths and query parameters', () => {
    expect(safeReturnPath('/routines', 'member')).toBe('/routines');
    expect(safeReturnPath('/payments?status=pending', 'member')).toBe('/payments?status=pending');
    expect(safeReturnPath({ pathname: '/profile', search: '?tab=progress' }, 'member')).toBe(
      '/profile?tab=progress'
    );
  });

  it('rejects open-redirect attempts with schemes or protocol-relative slashes', () => {
    expect(safeReturnPath('https://evil.com', 'member')).toBe('/panel');
    expect(safeReturnPath('http://evil.com', 'admin')).toBe('/panel');
    expect(safeReturnPath('//evil.com', 'member')).toBe('/panel');
    expect(safeReturnPath('//evil.com/path', 'member')).toBe('/panel');
    expect(safeReturnPath('javascript:alert(1)', 'member')).toBe('/panel');
  });

  it('rejects backslashes and directory traversal', () => {
    expect(safeReturnPath('/\\evil.com', 'member')).toBe('/panel');
    expect(safeReturnPath('/path/..//admin', 'member')).toBe('/panel');
    expect(safeReturnPath('/members/../settings', 'member')).toBe('/panel');
  });

  it('rejects /login to prevent infinite redirect loops', () => {
    expect(safeReturnPath('/login', 'member')).toBe('/panel');
    expect(safeReturnPath('/login?ref=1', 'member')).toBe('/panel');
    expect(safeReturnPath('/LOGIN', 'member')).toBe('/panel');
  });

  it('rejects root "/" redirecting to default role dashboard', () => {
    expect(safeReturnPath('/', 'member')).toBe('/panel');
    expect(safeReturnPath('/', 'receptionist')).toBe('/reception');
  });

  it('rejects strings that exceed 512 characters', () => {
    const huge = '/' + 'a'.repeat(600);
    expect(safeReturnPath(huge, 'member')).toBe('/panel');
  });
});
