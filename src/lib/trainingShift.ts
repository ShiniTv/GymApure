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
  diurno: 'bg-warning/10 text-warning border-warning/20',
  vespertino: 'bg-accent/10 text-accent border-accent/20',
  nocturno: 'bg-brand/10 text-brand border-brand/20',
};

export function formatMembershipId(userId: number): string {
  const year = new Date().getFullYear();
  return `GA-${year}-${String(userId).padStart(5, '0')}`;
}
