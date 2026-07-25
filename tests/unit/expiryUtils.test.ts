import { describe, expect, it } from 'vitest';
import {
  computeSubscriptionRemainingPercent,
  formatExpiryCountdown,
  getExpiryBadgeInfo,
  getExpirySeverity,
  getSubscriptionBarStyle,
  shouldShowExpiryAlert,
} from '../../src/lib/expiryUtils.ts';

describe('expiry utilities', () => {
  it('classifies expiry thresholds and alert visibility', () => {
    expect(getExpirySeverity(-1)).toBe('critical');
    expect(getExpirySeverity(3)).toBe('critical');
    expect(getExpirySeverity(4)).toBe('warning');
    expect(getExpirySeverity(8)).toBe('ok');
    expect(shouldShowExpiryAlert(7)).toBe(true);
    expect(shouldShowExpiryAlert(8)).toBe(false);
  });

  it('formats countdowns and hides non-alert badges', () => {
    expect(formatExpiryCountdown(0)).toBe('Tu membresía vence hoy.');
    expect(formatExpiryCountdown(1, 'plan')).toBe('Tu plan vence mañana.');
    expect(formatExpiryCountdown(5)).toBe('Tu membresía vence en 5 días.');
    expect(getExpiryBadgeInfo(null)).toBeNull();
    expect(getExpiryBadgeInfo(8)).toBeNull();
    expect(getExpiryBadgeInfo(0)?.label).toBe('Vence hoy');
  });

  it('clamps progress percentages and styles', () => {
    expect(computeSubscriptionRemainingPercent(15, '2026-07-01', '2026-07-31')).toBe(50);
    expect(computeSubscriptionRemainingPercent(-2, '2026-07-01', '2026-07-31')).toBe(0);
    expect(computeSubscriptionRemainingPercent(90, '2026-07-01', '2026-07-31')).toBe(100);
    expect(getSubscriptionBarStyle(120)).toEqual({
      widthPercent: 100,
      backgroundColor: 'hsl(142, 72%, 50%)',
    });
    expect(getSubscriptionBarStyle(-1).widthPercent).toBe(0);
  });
});
