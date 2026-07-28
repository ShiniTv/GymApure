export type CoachingTab =
  'rutinas' | 'progreso' | 'bloques' | 'agenda' | 'notas' | 'coaching' | 'perfil' | 'mediciones';

export function parseCoachingTab(raw: string | null): CoachingTab | null {
  if (
    raw === 'progreso' ||
    raw === 'bloques' ||
    raw === 'agenda' ||
    raw === 'notas' ||
    raw === 'coaching' ||
    raw === 'perfil' ||
    raw === 'mediciones' ||
    raw === 'rutinas'
  ) {
    return raw;
  }
  return null;
}

export function heightCmNumber(height: number | null | undefined): number | null {
  if (height == null || Number.isNaN(height)) return null;
  if (height > 0 && height < 3) return Math.round(height * 1000) / 10;
  return height;
}

export function formatMemberGoal(goal: string | null | undefined): string | null {
  if (!goal) return null;
  const map: Record<string, string> = {
    'Lose Weight': 'Bajar de peso',
    'Gain Muscle': 'Ganar músculo',
    'Gain Weight': 'Subir de peso',
    Maintain: 'Mantener',
    'General Fitness': 'Condición general',
  };
  return map[goal] ?? goal;
}
