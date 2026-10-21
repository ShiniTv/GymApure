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

  it('drops browser events when navigator is offline', () => {
    const originalNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false },
      configurable: true,
    });
    const event = {
      type: 'error',
      message: 'Failed to fetch',
    } as unknown as ErrorEvent;
    const result = browserBeforeSend(event, emptyHint);
    expect(result).toBeNull();
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  });

  it('drops intentional AbortError in browser', () => {
    const event = {
      type: 'error',
      exception: {
        values: [{ type: 'AbortError', value: 'The user aborted a request.' }],
      },
    } as unknown as ErrorEvent;
    const result = browserBeforeSend(event, {
      originalException: new Error('The user aborted a request.'),
    });
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

  it('drops transient pool pressure with 3 waiting clients', () => {
    const event = {
      type: 'default',
      message: 'Database pool waiting',
      extra: { waitingCount: 3, totalCount: 10 },
    } as unknown as ErrorEvent;
    expect(serverBeforeSend(event, emptyHint)).toBeNull();
  });

  it('keeps severe pool pressure samples', () => {
    const event = {
      type: 'default',
      message: 'Database pool waiting',
      extra: { waitingCount: 4, totalCount: 10 },
    } as unknown as ErrorEvent;
    expect(serverBeforeSend(event, emptyHint)).toEqual(event);
  });

  it('drops slow query warnings for trivial SELECT 1 health probes', () => {
    const event = {
      type: 'default',
      message: 'Slow database query',
      extra: { durationMs: 3600, query: 'SELECT 1' },
    } as unknown as ErrorEvent;
    expect(serverBeforeSend(event, emptyHint)).toBeNull();
  });

  it('keeps legitimate slow queries for actual business tables', () => {
    const event = {
      type: 'default',
      message: 'Slow database query',
      extra: { durationMs: 4500, query: 'SELECT * FROM workout_sessions WHERE user_id = $1' },
    } as unknown as ErrorEvent;
    expect(serverBeforeSend(event, emptyHint)).toEqual(event);
  });
});
