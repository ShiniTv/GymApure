export const HEALTH_CONDITION_FLAGS = [
  { id: 'diabetes', label: 'Diabetes' },
  { id: 'hypertension', label: 'Hipertensión' },
  { id: 'cardiovascular', label: 'Enfermedad cardiovascular' },
  { id: 'respiratory', label: 'Asma / problema respiratorio' },
  { id: 'musculoskeletal_injury', label: 'Lesión musculoesquelética' },
  { id: 'back_injury', label: 'Lesión de espalda / columna' },
  { id: 'joint_issues', label: 'Problemas articulares' },
  { id: 'post_surgery', label: 'Post-operatorio reciente' },
  { id: 'mobility_disability', label: 'Discapacidad / movilidad reducida' },
  { id: 'other', label: 'Otra condición' },
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
