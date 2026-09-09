import { describe, expect, it } from 'vitest';
import { proposeLoadSuggestion } from '../../src/lib/coachingSuggestionRules.ts';

const baseExercise = {
  sets: 3,
  reps: 10,
  rest_seconds: 90,
  weight_suggestion: '60 kg',
};

describe('coachingSuggestionRules', () => {
  it('suggests deload on high soreness', () => {
    const result = proposeLoadSuggestion(baseExercise, {
      energy: 3,
      sleep_quality: 3,
      stress_level: 2,
      soreness_level: 5,
      adherence_score: 4,
      average_discomfort: null,
      average_energy: null,
      average_exertion: null,
    });
    expect(result.suggestionType).toBe('deload');
    expect(result.rationale.rule).toBe('recovery_guard');
    expect(result.proposedSnapshot.sets).toBe(2);
  });

  it('suggests load increase when recovered and adherent', () => {
    const result = proposeLoadSuggestion(baseExercise, {
      energy: 5,
      sleep_quality: 5,
      stress_level: 1,
      soreness_level: 1,
      adherence_score: 5,
      average_discomfort: 1,
      average_energy: 4,
      average_exertion: 6,
    });
    expect(result.suggestionType).toBe('load_increase');
    expect(result.rationale.rule).toBe('progression_ready');
  });

  it('maintains when signals are mixed', () => {
    const result = proposeLoadSuggestion(baseExercise, {
      energy: 3,
      sleep_quality: 3,
      stress_level: 3,
      soreness_level: 3,
      adherence_score: 3,
      average_discomfort: null,
      average_energy: null,
      average_exertion: null,
    });
    expect(result.suggestionType).toBe('maintain');
  });
});
