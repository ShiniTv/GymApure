import { describe, expect, it } from 'vitest';
import { moveItemAt, routineExerciseOrderIds } from '../../src/lib/routineExerciseOrder.ts';

describe('routine exercise order', () => {
  it('moves an item up and down', () => {
    const items = ['a', 'b', 'c'];
    expect(moveItemAt(items, 1, 0)).toEqual(['b', 'a', 'c']);
    expect(moveItemAt(items, 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('ignores out-of-range moves', () => {
    const items = ['a', 'b'];
    expect(moveItemAt(items, 0, 5)).toEqual(items);
    expect(moveItemAt(items, -1, 0)).toEqual(items);
  });

  it('maps routine exercise ids in list order', () => {
    expect(
      routineExerciseOrderIds([
        { routine_exercise_id: 9 },
        { routine_exercise_id: 3 },
      ])
    ).toEqual([9, 3]);
  });
});
