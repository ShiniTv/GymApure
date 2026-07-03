export const TRAINING_SHIFTS = ['diurno', 'vespertino', 'nocturno'] as const;
export type TrainingShift = (typeof TRAINING_SHIFTS)[number];

export const TRAINER_LEVELS = ['basico', 'avanzado', 'especialista'] as const;
export type TrainerLevel = (typeof TRAINER_LEVELS)[number];

export function isTrainingShift(value: unknown): value is TrainingShift {
  return typeof value === 'string' && (TRAINING_SHIFTS as readonly string[]).includes(value);
}

export function isTrainerLevel(value: unknown): value is TrainerLevel {
  return typeof value === 'string' && (TRAINER_LEVELS as readonly string[]).includes(value);
}

export const SHIFT_LABELS: Record<TrainingShift, string> = {
  diurno: 'Diurno / Mañana',
  vespertino: 'Vespertino / Tarde',
  nocturno: 'Nocturno / Noche',
};

export const SHIFT_SHORT_LABELS: Record<TrainingShift, string> = {
  diurno: 'Diurno',
  vespertino: 'Vespertino',
  nocturno: 'Nocturno',
};

export const LEVEL_LABELS: Record<TrainerLevel, string> = {
  basico: 'Básico',
  avanzado: 'Avanzado',
  especialista: 'Especialista',
};

export const SHIFT_BADGE_CLASSES: Record<TrainingShift, string> = {
  diurno: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  vespertino: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  nocturno: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
};

export function formatMembershipId(userId: number): string {
  const year = new Date().getFullYear();
  return `GA-${year}-${String(userId).padStart(5, '0')}`;
}

export function buildBadgeQrUrl(cedula: string): string {
  const payload = encodeURIComponent(JSON.stringify({ cedula, v: 1 }));
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${payload}`;
}
