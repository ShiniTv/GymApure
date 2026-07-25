import { describe, expect, it } from 'vitest';
import {
  getMacroStatus,
  macroHint,
  sumLogEntries,
  type NutritionLogEntry,
  type NutritionPlan,
} from '../../src/lib/nutrition.ts';

const plan = {
  calories_target: 2000,
  protein_target_g: 150,
  carbs_target_g: 220,
  fat_target_g: 70,
  calories_margin: 100,
  protein_margin_g: 10,
  carbs_margin_g: 20,
  fat_margin_g: 5,
} as NutritionPlan;

describe('nutrition utilities', () => {
  it('sums entries and rounds fractional macros to one decimal', () => {
    const entries = [
      { calories: 400, protein_g: 20.26, carbs_g: 30.24, fat_g: 10.05 },
      { calories: '250', protein_g: 10.25, carbs_g: 15.25, fat_g: 5.06 },
    ] as unknown as NutritionLogEntry[];
    expect(sumLogEntries(entries)).toEqual({
      calories: 650,
      protein: 30.6,
      carbs: 45.5,
      fat: 15.2,
    });
  });

  it('classifies absent, under, near-boundary, on-track, and over targets', () => {
    expect(getMacroStatus(5, 0, 0)).toBe('no_target');
    expect(getMacroStatus(80, 100, 10)).toBe('under');
    expect(getMacroStatus(90, 100, 10)).toBe('near_low');
    expect(getMacroStatus(100, 100, 10)).toBe('on_track');
    expect(getMacroStatus(110, 100, 10)).toBe('near_high');
    expect(getMacroStatus(111, 100, 10)).toBe('over');
  });

  it('produces actionable hints only outside the target range', () => {
    expect(macroHint(plan, { calories: 1500, protein: 150, carbs: 220, fat: 70 }, 'calories')).toBe(
      'Te faltan 500 kcal'
    );
    expect(macroHint(plan, { calories: 2000, protein: 180, carbs: 220, fat: 70 }, 'protein')).toBe(
      'Superaste en 30 g P'
    );
    expect(
      macroHint(plan, { calories: 2000, protein: 150, carbs: 220, fat: 70 }, 'protein')
    ).toBeNull();
  });
});
