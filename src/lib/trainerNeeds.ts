export type TrainerNeedsFilter = 'assessment' | 'checkin' | 'recovery' | 'choices';

export function parseTrainerNeedsFilter(raw: string | null | undefined): TrainerNeedsFilter | '' {
  if (raw === 'assessment' || raw === 'checkin' || raw === 'recovery' || raw === 'choices') {
    return raw;
  }
  return '';
}

export function hubTabForNeeds(
  needs: TrainerNeedsFilter | ''
): 'coaching' | 'progreso' | 'rutinas' | undefined {
  if (needs === 'assessment' || needs === 'checkin') return 'coaching';
  if (needs === 'recovery') return 'progreso';
  if (needs === 'choices') return 'rutinas';
  return undefined;
}

export function memberCoachingHref(memberId: number, tab?: string): string {
  return tab ? `/members/${memberId}/routines?tab=${tab}` : `/members/${memberId}/routines`;
}

export const TRAINER_NEEDS_LABELS: Record<TrainerNeedsFilter, string> = {
  assessment: 'Sin evaluación',
  checkin: 'Seguimiento',
  recovery: 'Recuperación',
  choices: 'Elecciones del cliente',
};
