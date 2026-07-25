import { describe, expect, it } from 'vitest';
import {
  buildRoutineExercisePayload,
  buildRoutineExerciseUpdatePayload,
  defaultRoutineExerciseForm,
} from '../../src/lib/routineExercisePayload.ts';

describe('routine exercise payloads', () => {
  it('builds a compact uniform prescription payload', () => {
    expect(
      buildRoutineExercisePayload({
        ...defaultRoutineExerciseForm(),
        exercise_id: '42',
        weight_suggestion: '  Moderado  ',
      })
    ).toEqual({
      exercise_id: 42,
      sets: 3,
      reps: 10,
      rest_seconds: 60,
      weight_suggestion: 'Moderado',
      set_prescription: null,
    });
  });

  it('preserves varied per-set reps and derives the summary', () => {
    const payload = buildRoutineExerciseUpdatePayload({
      sets: 3,
      reps: 10,
      rest_seconds: 90,
      weight_suggestion: ' ',
      set_prescription: [
        { set_number: 1, reps: 12, weight_kg: null },
        { set_number: 2, reps: 10, weight_kg: null },
        { set_number: 3, reps: 8, weight_kg: null },
      ],
    });
    expect(payload.sets).toBe(3);
    expect(payload.reps).toBe(12);
    expect(payload.weight_suggestion).toBeNull();
    expect(payload.set_prescription?.map((row) => row.reps)).toEqual([12, 10, 8]);
  });

  it('rejects an invalid exercise id', () => {
    expect(() =>
      buildRoutineExercisePayload({ ...defaultRoutineExerciseForm(), exercise_id: '0' })
    ).toThrow('Selecciona un ejercicio válido');
  });
});
