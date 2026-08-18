import { describe, expect, it } from 'vitest';
import {
  inferPrescriptionStyle,
  prescriptionStyleBadges,
} from '../../src/lib/exercisePrescriptionStyle.ts';

describe('inferPrescriptionStyle', () => {
  it('uses time for planks and holds', () => {
    expect(inferPrescriptionStyle('Plancha abdominal')).toEqual({
      effort: 'time',
      load: 'none',
    });
    expect(inferPrescriptionStyle('Hollow hold')).toEqual({ effort: 'time', load: 'none' });
  });

  it('uses plates for cable and machine work', () => {
    expect(inferPrescriptionStyle('Jalón al pecho en polea')).toEqual({
      effort: 'reps',
      load: 'plates',
    });
    expect(inferPrescriptionStyle('Face pull en cable')).toEqual({
      effort: 'reps',
      load: 'plates',
    });
  });

  it('uses kg for free weights', () => {
    expect(inferPrescriptionStyle('Press banca con barra')).toEqual({
      effort: 'reps',
      load: 'kg',
    });
    expect(inferPrescriptionStyle('Curl de bíceps con mancuernas')).toEqual({
      effort: 'reps',
      load: 'kg',
    });
  });

  it('exposes badges only for time and plates', () => {
    expect(prescriptionStyleBadges('Plancha')).toEqual(['Tiempo']);
    expect(prescriptionStyleBadges('Cruce en polea')).toEqual(['Placas']);
    expect(prescriptionStyleBadges('Sentadilla con barra')).toEqual([]);
  });
});
