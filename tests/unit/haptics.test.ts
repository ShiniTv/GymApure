import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  hapticLight,
  hapticSuccess,
  hapticError,
  playAppleClick,
  playAppleSuccessTone,
  playAppleErrorTone,
} from '../../src/lib/haptics';

describe('haptics and audio feedback', () => {
  const originalVibrate = navigator.vibrate;

  beforeEach(() => {
    navigator.vibrate = vi.fn();
  });

  afterEach(() => {
    navigator.vibrate = originalVibrate;
  });

  it('triggers light haptic feedback with 15ms pattern', () => {
    hapticLight();
    expect(navigator.vibrate).toHaveBeenCalledWith(15);
  });

  it('triggers success haptic feedback with [20, 40, 20] pattern', () => {
    hapticSuccess();
    expect(navigator.vibrate).toHaveBeenCalledWith([20, 40, 20]);
  });

  it('triggers error haptic feedback with [40, 60, 40] pattern', () => {
    hapticError();
    expect(navigator.vibrate).toHaveBeenCalledWith([40, 60, 40]);
  });

  it('safe execution when audio / vibration is unavailable', () => {
    // @ts-expect-error test unavailable vibrate
    delete navigator.vibrate;
    expect(() => {
      playAppleClick();
      playAppleSuccessTone();
      playAppleErrorTone();
      hapticLight();
      hapticSuccess();
      hapticError();
    }).not.toThrow();
  });
});
