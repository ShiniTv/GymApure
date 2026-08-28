import { describe, expect, it } from 'vitest';
import type { ErrorEvent, EventHint } from '@sentry/core';
import { browserBeforeSend, serverBeforeSend } from '../../src/lib/sentryFilters.ts';

const emptyHint: EventHint = {};

describe('sentryFilters', () => {
  it('drops transient service worker registration noise in browser', () => {
    const event = {
      type: 'error',
      exception: {
        values: [{ type: 'SecurityError', value: 'Script https://example.com/sw.js load failed' }],
      },
    } as unknown as ErrorEvent;
    const result = browserBeforeSend(event, emptyHint);
    expect(result).toBeNull();
  });

  it('drops transient network aborts on server', () => {
    const event = {
      type: 'error',
      exception: { values: [{ type: 'Error', value: 'read ECONNABORTED' }] },
    } as unknown as ErrorEvent;
    const result = serverBeforeSend(event, {
      originalException: new Error('read ECONNABORTED'),
    });
    expect(result).toBeNull();
  });

  it('drops low-severity pool pressure samples', () => {
    const event = {
      type: 'default',
      message: 'Database pool waiting',
      extra: { waitingCount: 1, totalCount: 5 },
    } as unknown as ErrorEvent;
    const result = serverBeforeSend(event, emptyHint);
    expect(result).toBeNull();
  });

  it('keeps severe pool pressure samples', () => {
    const event = {
      type: 'default',
      message: 'Database pool waiting',
      extra: { waitingCount: 4, totalCount: 10 },
    } as unknown as ErrorEvent;
    expect(serverBeforeSend(event, emptyHint)).toEqual(event);
  });
});
