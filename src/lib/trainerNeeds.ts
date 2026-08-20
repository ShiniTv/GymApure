export type TrainerNeedsFilter = 'assessment' | 'checkin' | 'recovery';

export function parseTrainerNeedsFilter(raw: string | null | undefined): TrainerNeedsFilter | '' {
  if (raw === 'assessment' || raw === 'checkin' || raw === 'recovery') return raw;
  return '';
}

export function hubTabForNeeds(
  needs: TrainerNeedsFilter | ''
): 'coaching' | 'progreso' | undefined {
  if (needs === 'assessment' || needs === 'checkin') return 'coaching';
  if (needs === 'recovery') return 'progreso';
  return undefined;
}

export function memberCoachingHref(memberId: number, tab?: string): string {
  return tab ? `/members/${memberId}/routines?tab=${tab}` : `/members/${memberId}/routines`;
}

export const TRAINER_NEEDS_LABELS: Record<TrainerNeedsFilter, string> = {
  assessment: 'Sin evaluación',
  checkin: 'Check-in',
  recovery: 'Recuperación',
};
