import type { EffortMode, LoadMode } from './setPrescription';

const TIME_HINT =
  /plancha|plank|isometr|dead hang|hang|wall sit|hollow hold|l-sit|farmer hold|hold\b|sill[oó]n|prancha|plank hold/i;

const PLATE_HINT =
  /polea|pulley|cable|m[aá]quina|machine|jal[oó]n|lat pulldown|face pull|cruce|crossover|pushdown|tr[ií]ceps en polea|extensi[oó]n de tr[ií]ceps en/i;

const FREE_WEIGHT_HINT =
  /mancuerna|dumbbell|barra|barbell|press|sentadilla|peso muerto|deadlift|curl|remo con barra|hip thrust|zancada|lunges?/i;

export function inferPrescriptionStyle(name: string): { effort: EffortMode; load: LoadMode } {
  const timed = TIME_HINT.test(name);
  if (timed) {
    return { effort: 'time', load: PLATE_HINT.test(name) ? 'plates' : 'none' };
  }
  if (PLATE_HINT.test(name)) return { effort: 'reps', load: 'plates' };
  if (FREE_WEIGHT_HINT.test(name)) return { effort: 'reps', load: 'kg' };
  return { effort: 'reps', load: 'none' };
}

export function defaultEffortAmount(effort: EffortMode): number {
  return effort === 'time' ? 30 : 10;
}

export function defaultPlateCount(): number {
  return 4;
}

export function prescriptionStyleBadges(name: string): string[] {
  const style = inferPrescriptionStyle(name);
  const badges: string[] = [];
  if (style.effort === 'time') badges.push('Tiempo');
  if (style.load === 'plates') badges.push('Placas');
  return badges;
}
