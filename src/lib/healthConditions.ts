export const HEALTH_CONDITION_FLAGS = [
  { id: 'diabetes', label: 'Diabetes', shortLabel: 'Diabetes' },
  { id: 'hypertension', label: 'Hipertensión', shortLabel: 'Hipertensión' },
  { id: 'cardiovascular', label: 'Enfermedad cardiovascular', shortLabel: 'Cardiovascular' },
  { id: 'respiratory', label: 'Asma / problema respiratorio', shortLabel: 'Asma / respiratorio' },
  {
    id: 'musculoskeletal_injury',
    label: 'Lesión musculoesquelética',
    shortLabel: 'Lesión muscular',
  },
  { id: 'back_injury', label: 'Lesión de espalda / columna', shortLabel: 'Espalda / columna' },
  { id: 'joint_issues', label: 'Problemas articulares', shortLabel: 'Articulares' },
  { id: 'post_surgery', label: 'Post-operatorio reciente', shortLabel: 'Post-operatorio' },
  {
    id: 'mobility_disability',
    label: 'Discapacidad / movilidad reducida',
    shortLabel: 'Movilidad',
  },
  { id: 'other', label: 'Otra condición', shortLabel: 'Otra' },
] as const;

export type HealthConditionFlagId = (typeof HEALTH_CONDITION_FLAGS)[number]['id'];

const FLAG_LABEL_MAP = new Map(HEALTH_CONDITION_FLAGS.map((f) => [f.id, f.label]));

export const HEALTH_CONDITION_FLAG_IDS = HEALTH_CONDITION_FLAGS.map((f) => f.id);

export function isValidHealthConditionFlag(id: string): id is HealthConditionFlagId {
  return FLAG_LABEL_MAP.has(id as HealthConditionFlagId);
}

export function formatHealthFlagsForDisplay(flags: string[]): { id: string; label: string }[] {
  return flags
    .filter(isValidHealthConditionFlag)
    .map((id) => ({ id, label: FLAG_LABEL_MAP.get(id)! }));
}

/** Flags that trainers should notice when planning sessions. */
export const CRITICAL_HEALTH_FLAGS: ReadonlySet<HealthConditionFlagId> = new Set([
  'cardiovascular',
  'post_surgery',
]);

export function hasCriticalHealthFlags(flags: string[]): boolean {
  return flags.some((f) => CRITICAL_HEALTH_FLAGS.has(f as HealthConditionFlagId));
}
