import { describe, expect, it } from 'vitest';
import {
  hubTabForNeeds,
  memberCoachingHref,
  parseTrainerNeedsFilter,
} from '../../src/lib/trainerNeeds';
import { parseUserIdsQuery } from '../../src/api/users/listHelpers';

describe('parseTrainerNeedsFilter', () => {
  it('acepta cohortes de atención y rechaza el resto', () => {
    expect(parseTrainerNeedsFilter('assessment')).toBe('assessment');
    expect(parseTrainerNeedsFilter('checkin')).toBe('checkin');
    expect(parseTrainerNeedsFilter('recovery')).toBe('recovery');
    expect(parseTrainerNeedsFilter('choices')).toBe('choices');
    expect(parseTrainerNeedsFilter('expiring')).toBe('');
    expect(parseTrainerNeedsFilter(null)).toBe('');
  });
});

describe('hubTabForNeeds', () => {
  it('abre coaching, progreso o rutinas según la cohorte', () => {
    expect(hubTabForNeeds('assessment')).toBe('coaching');
    expect(hubTabForNeeds('checkin')).toBe('coaching');
    expect(hubTabForNeeds('recovery')).toBe('progreso');
    expect(hubTabForNeeds('choices')).toBe('rutinas');
    expect(hubTabForNeeds('')).toBeUndefined();
  });
});

describe('memberCoachingHref', () => {
  it('añade tab solo cuando hay destino', () => {
    expect(memberCoachingHref(12)).toBe('/members/12/routines');
    expect(memberCoachingHref(12, 'coaching')).toBe('/members/12/routines?tab=coaching');
  });
});

describe('parseUserIdsQuery', () => {
  it('parsea ids positivos únicos y recorta a 50', () => {
    expect(parseUserIdsQuery('3, 3, -1, abc, 8')).toEqual([3, 8]);
    expect(parseUserIdsQuery(['1', '2'])).toEqual([1, 2]);
    const many = Array.from({ length: 60 }, (_, i) => String(i + 1)).join(',');
    expect(parseUserIdsQuery(many)).toHaveLength(50);
  });
});
