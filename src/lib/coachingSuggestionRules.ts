export type SuggestionType = 'load_increase' | 'load_decrease' | 'maintain' | 'deload';

export interface CoachingSignals {
  energy: number | null;
  sleep_quality: number | null;
  stress_level: number | null;
  soreness_level: number | null;
  adherence_score: number | null;
  average_discomfort: number | null;
  average_energy: number | null;
  average_exertion: number | null;
}

export interface ExerciseSnapshot {
  sets: number;
  reps: number;
  rest_seconds: number;
  weight_suggestion: string | null;
}

/**
 * Pure coaching rule used by trainerCoaching API (recovery_guard / progression_ready).
 */
export function proposeLoadSuggestion(
  exercise: ExerciseSnapshot,
  signals: CoachingSignals
): {
  suggestionType: SuggestionType;
  currentSnapshot: ExerciseSnapshot;
  proposedSnapshot: Record<string, unknown>;
  rationale: Record<string, unknown>;
} {
  const currentSnapshot = { ...exercise };
  const needsDeload =
    (signals.soreness_level !== null && signals.soreness_level >= 4) ||
    (signals.energy !== null && signals.energy <= 2) ||
    (signals.sleep_quality !== null && signals.sleep_quality <= 2) ||
    (signals.stress_level !== null && signals.stress_level >= 4) ||
    (signals.average_discomfort !== null && signals.average_discomfort >= 4) ||
    (signals.average_energy !== null && signals.average_energy <= 2);

  const readyToProgress =
    signals.adherence_score !== null &&
    signals.adherence_score >= 4 &&
    signals.energy !== null &&
    signals.energy >= 4 &&
    signals.sleep_quality !== null &&
    signals.sleep_quality >= 4 &&
    (signals.stress_level === null || signals.stress_level <= 2) &&
    (signals.soreness_level === null || signals.soreness_level <= 2) &&
    (signals.average_discomfort === null || signals.average_discomfort <= 2) &&
    (signals.average_exertion === null || signals.average_exertion <= 7);

  if (needsDeload) {
    return {
      suggestionType: 'deload',
      currentSnapshot,
      proposedSnapshot: {
        ...currentSnapshot,
        sets: Math.max(1, exercise.sets - 1),
        weight_suggestion: 'Reducir la carga aproximada un 10%',
      },
      rationale: {
        rule: 'recovery_guard',
        message: 'Señales de recuperación baja o molestias elevadas; reducir volumen y carga.',
        signals,
      },
    };
  }

  if (readyToProgress) {
    return {
      suggestionType: 'load_increase',
      currentSnapshot,
      proposedSnapshot: {
        ...currentSnapshot,
        reps: exercise.reps + 1,
        weight_suggestion: 'Probar un aumento gradual de carga si se mantiene la técnica',
      },
      rationale: {
        rule: 'progression_ready',
        message: 'Buena adherencia y recuperación; se puede progresar de forma gradual.',
        signals,
      },
    };
  }

  return {
    suggestionType: 'maintain',
    currentSnapshot,
    proposedSnapshot: currentSnapshot,
    rationale: {
      rule: 'maintain',
      message: 'No hay señales suficientes para cambiar la prescripción esta semana.',
      signals,
    },
  };
}
