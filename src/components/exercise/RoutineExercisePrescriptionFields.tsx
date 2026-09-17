import { useEffect, useState, useMemo } from 'react';
import { Label, Input, SegmentedControl } from '../ui';
import { SetPrescriptionEditor } from './SetPrescriptionEditor';
import { parsePositiveInt } from '../../lib/parseFormNumber';
import type { EffortMode, LoadMode, SetPrescriptionRow } from '../../lib/setPrescription';
import {
  defaultRepsFromPrescription,
  deriveSetPrescription,
  hasDetailedSetPrescription,
  prescriptionEffort,
  prescriptionLoad,
  resizeSetPrescription,
  stampPrescriptionStyle,
} from '../../lib/setPrescription';
import {
  defaultEffortAmount,
  defaultPlateCount,
  inferPrescriptionStyle,
} from '../../lib/exercisePrescriptionStyle';

export interface RoutineExercisePrescriptionValue {
  sets: number;
  reps: number;
  set_prescription?: SetPrescriptionRow[] | null;
}

interface RoutineExercisePrescriptionFieldsProps {
  value: RoutineExercisePrescriptionValue;
  onChange: (value: RoutineExercisePrescriptionValue) => void;
  formKey?: string;
  /** When set (add flow), infers tiempo/placas from the exercise name. */
  selectedExerciseName?: string;
}

function applyStyle(
  value: RoutineExercisePrescriptionValue,
  effort: EffortMode,
  load: LoadMode
): RoutineExercisePrescriptionValue {
  const currentEffort = prescriptionEffort(value.set_prescription);

  const amount =
    effort === currentEffort
      ? value.reps
      : effort === 'time'
        ? defaultEffortAmount(effort)
        : value.reps;

  const base = deriveSetPrescription(value.sets, amount, value.set_prescription);

  const stamped = stampPrescriptionStyle(base, { effort, load }).map((row, idx) => {
    const originalRow = value.set_prescription?.[idx];
    return {
      ...row,
      reps: effort === 'time' ? row.reps : amount,
      plates: load === 'plates' ? (originalRow?.plates ?? row.plates ?? defaultPlateCount()) : null,
      weight_kg: load === 'kg' ? (originalRow?.weight_kg ?? row.weight_kg ?? null) : null,
    };
  });

  return { ...value, reps: amount, set_prescription: stamped };
}

export function RoutineExercisePrescriptionFields({
  value,
  onChange,
  formKey = 'default',
  selectedExerciseName,
}: RoutineExercisePrescriptionFieldsProps) {
  const [useDetailed, setUseDetailed] = useState(() =>
    hasDetailedSetPrescription(value.set_prescription)
  );
  const effort = prescriptionEffort(value.set_prescription);
  const load = prescriptionLoad(value.set_prescription);

  useEffect(() => {
    setUseDetailed(hasDetailedSetPrescription(value.set_prescription));
  }, [formKey, value.set_prescription]);

  useEffect(() => {
    if (!selectedExerciseName) return;
    const style = inferPrescriptionStyle(selectedExerciseName);
    onChange(applyStyle(value, style.effort, style.load));
  }, [formKey, selectedExerciseName, value.sets, value.reps]);

  const enableDetailed = () => {
    setUseDetailed(true);
    const currentPrescription =
      value.set_prescription ?? deriveSetPrescription(value.sets, value.reps);
    const currentEffort = prescriptionEffort(currentPrescription);
    const currentLoad = prescriptionLoad(currentPrescription);
    onChange({
      ...value,
      set_prescription: stampPrescriptionStyle(currentPrescription, {
        effort: currentEffort,
        load: currentLoad,
      }),
    });
  };

  const disableDetailed = () => {
    setUseDetailed(false);
    const currentPrescription =
      value.set_prescription ?? deriveSetPrescription(value.sets, value.reps);
    const reps = defaultRepsFromPrescription(currentPrescription, value.reps);
    const currentEffort = prescriptionEffort(currentPrescription);
    const currentLoad = prescriptionLoad(currentPrescription);
    onChange({
      ...value,
      reps,
      set_prescription: stampPrescriptionStyle(
        deriveSetPrescription(value.sets, reps, currentPrescription),
        { effort: currentEffort, load: currentLoad }
      ),
    });
  };

  const uniformLoadValue =
    load === 'plates'
      ? (value.set_prescription?.[0]?.plates ?? defaultPlateCount())
      : (value.set_prescription?.[0]?.weight_kg ?? '');

  const currentPrescription = useMemo(
    () => value.set_prescription ?? deriveSetPrescription(value.sets, value.reps),
    [value.set_prescription, value.sets, value.reps]
  );
  const currentEffort = prescriptionEffort(currentPrescription);
  const currentLoad = prescriptionLoad(currentPrescription);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-text mb-1.5 text-xs font-medium">Cada serie se mide en</p>
        <SegmentedControl
          variant="compact"
          value={effort}
          onChange={(next) => onChange(applyStyle(value, next, load))}
          options={[
            { value: 'reps', label: 'Repeticiones' },
            { value: 'time', label: 'Tiempo' },
          ]}
        />
        <p className="text-text-muted text-small mt-1">
          {currentEffort === 'time'
            ? 'La serie dura un tiempo fijo. El valor se guarda en segundos.'
            : 'Cuentas repeticiones en cada serie.'}
        </p>
      </div>
      <div>
        <p className="text-text mb-1.5 text-xs font-medium">Carga</p>
        <SegmentedControl
          variant="compact"
          value={load}
          onChange={(next) => onChange(applyStyle(value, effort, next))}
          options={[
            { value: 'none', label: 'Sin carga' },
            { value: 'kg', label: 'Kg' },
            { value: 'plates', label: 'Placas' },
          ]}
        />
        <p className="text-text-muted text-small mt-1">
          {currentLoad === 'plates'
            ? 'Stack de polea o máquina: cuántas placas pinchas.'
            : currentLoad === 'kg'
              ? 'Peso libre o discos en kilos.'
              : 'Sin peso: peso corporal, isometrías o cardio.'}
        </p>
      </div>

      <div className={useDetailed ? 'max-w-32' : 'grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-3'}>
        <div>
          <Label>Series</Label>
          <Input
            type="number"
            min={1}
            value={value.sets}
            onChange={(e) => {
              const nextSets = parsePositiveInt(e.target.value, value.sets);
              onChange({
                ...value,
                sets: nextSets,
                set_prescription: resizeSetPrescription(
                  stampPrescriptionStyle(
                    value.set_prescription ?? deriveSetPrescription(value.sets, value.reps),
                    { effort: currentEffort, load: currentLoad }
                  ),
                  nextSets,
                  value.reps
                ),
              });
            }}
          />
        </div>
        {!useDetailed && (
          <>
            <div>
              <Label>{currentEffort === 'time' ? 'Segundos por serie' : 'Repeticiones'}</Label>
              <Input
                type="number"
                min={1}
                value={value.reps}
                onChange={(e) => {
                  const reps = parsePositiveInt(e.target.value, value.reps);
                  const currentPrescription =
                    value.set_prescription ?? deriveSetPrescription(value.sets, value.reps);
                  const currentEffort = prescriptionEffort(currentPrescription);
                  const currentLoad = prescriptionLoad(currentPrescription);
                  onChange({
                    ...value,
                    reps,
                    set_prescription: stampPrescriptionStyle(
                      deriveSetPrescription(value.sets, reps, currentPrescription),
                      { effort: currentEffort, load: currentLoad }
                    ),
                  });
                }}
              />
              <p className="text-text-muted text-small mt-1">
                {effort === 'time'
                  ? 'Tiempo de trabajo de cada serie (plancha, isometría, holds).'
                  : 'Mismo número en todas las series.'}
              </p>
            </div>
            {currentLoad !== 'none' ? (
              <div>
                <Label>{currentLoad === 'plates' ? 'Placas' : 'Peso (kg)'}</Label>
                <Input
                  type="number"
                  min={0}
                  step={currentLoad === 'kg' ? '0.5' : '1'}
                  value={uniformLoadValue}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    const n = raw === '' ? null : Number(raw);
                    const parsed = n != null && Number.isFinite(n) ? n : null;
                    const rows = stampPrescriptionStyle(
                      deriveSetPrescription(value.sets, value.reps, currentPrescription),
                      { effort: currentEffort, load: currentLoad }
                    ).map((row) =>
                      currentLoad === 'plates'
                        ? { ...row, plates: parsed }
                        : { ...row, weight_kg: parsed }
                    );
                    onChange({ ...value, set_prescription: rows });
                  }}
                />
                <p className="text-text-muted text-small mt-1">
                  {currentLoad === 'plates'
                    ? 'Número de placas en el stack de la polea o máquina.'
                    : 'Carga en kilos; déjalo vacío si aún no la defines.'}
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="border-border flex items-start gap-2.5 rounded-lg border px-3 py-2.5">
        <input
          id="routine-exercise-detailed-prescription"
          type="checkbox"
          className="text-brand focus:ring-brand mt-0.5 h-4 w-4 rounded"
          checked={useDetailed}
          onChange={(e) => {
            if (e.target.checked) enableDetailed();
            else disableDetailed();
          }}
        />
        <label htmlFor="routine-exercise-detailed-prescription" className="min-w-0 cursor-pointer">
          <span className="text-text block text-xs font-medium">Variar por serie</span>
          <span className="text-text-muted text-small mt-0.5 block">
            Cambia reps, segundos o placas entre la 1 y la 3. Si todas van igual, déjalo apagado.
          </span>
        </label>
      </div>

      {useDetailed && (
        <SetPrescriptionEditor
          sets={value.sets}
          defaultReps={defaultRepsFromPrescription(value.set_prescription, value.reps)}
          effort={currentEffort}
          load={currentLoad}
          value={
            value.set_prescription ??
            stampPrescriptionStyle(resizeSetPrescription([], value.sets, value.reps), {
              effort,
              load,
            })
          }
          onChange={(set_prescription) => {
            onChange({
              ...value,
              reps: defaultRepsFromPrescription(set_prescription, value.reps),
              set_prescription: stampPrescriptionStyle(set_prescription, { effort, load }),
            });
          }}
        />
      )}
    </div>
  );
}
