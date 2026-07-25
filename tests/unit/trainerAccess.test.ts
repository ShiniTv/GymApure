import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));
vi.mock('../../src/db/index.ts', () => ({ query: queryMock }));

import {
  ensureTrainerMemberAssignment,
  isActiveMember,
  trainerHasMemberAccess,
  trainerHasMemberRoutineAccess,
  trainerOwnsRoutine,
} from '../../src/lib/trainerAccess.ts';

describe('trainer access queries', () => {
  beforeEach(() => queryMock.mockReset());

  it.each([
    ['trainerOwnsRoutine', () => trainerOwnsRoutine(7, 11), [11, 7]],
    ['isActiveMember', () => isActiveMember(13), [13]],
    ['trainerHasMemberAccess', () => trainerHasMemberAccess(7, 13), [13, 7]],
    ['trainerHasMemberRoutineAccess', () => trainerHasMemberRoutineAccess(7, 13, 11), [13, 11, 7]],
  ])('%s returns true only when its ownership query finds a row', async (_name, call, params) => {
    queryMock.mockResolvedValueOnce({ rows: [{ ok: 1 }] });
    await expect(call()).resolves.toBe(true);
    expect(queryMock).toHaveBeenLastCalledWith(expect.stringContaining('SELECT 1 AS ok'), params);

    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(call()).resolves.toBe(false);
  });

  it('creates an idempotent explicit assignment and normalizes missing assignedBy', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    await ensureTrainerMemberAssignment(7, 13);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (trainer_id, member_id) DO NOTHING'),
      [7, 13, null]
    );
  });
});
