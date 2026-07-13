import { useEffect, useState } from 'react';
import { Label, Input } from '../ui';
import { SetPrescriptionEditor } from './SetPrescriptionEditor';
import { parsePositiveInt } from '../../lib/parseFormNumber';
import type { SetPrescriptionRow } from '../../lib/setPrescription';
import {
  defaultRepsFromPrescription,
  deriveSetPrescription,
  hasDetailedSetPrescription,
  resizeSetPrescription,
} from '../../lib/setPrescription';

export interface RoutineExercisePrescriptionValue {
  sets: number;
  reps: number;
  set_prescription?: SetPrescriptionRow[] | null;
}

interface RoutineExercisePrescriptionFieldsProps {
  value: RoutineExercisePrescriptionValue;
  onChange: (value: RoutineExercisePrescriptionValue) => void;
  /** Changes when switching add/edit or another exercise — resets detailed toggle */
  formKey?: string;
}

export function RoutineExercisePrescriptionFields({
  value,
  onChange,
  formKey = 'default',
}: RoutineExercisePrescriptionFieldsProps) {
  const [useDetailed, setUseDetailed] = useState(() =>
    hasDetailedSetPrescription(value.set_prescription)
  );

  useEffect(() => {
    setUseDetailed(hasDetailedSetPrescription(value.set_prescription));
  }, [formKey]);

  const enableDetailed = () => {
    setUseDetailed(true);
    onChange({
      ...value,
      set_prescription: deriveSetPrescription(value.sets, value.reps, value.set_prescription),
    });
  };

  const disableDetailed = () => {
    setUseDetailed(false);
    onChange({
      ...value,
      reps: defaultRepsFromPrescription(value.set_prescription, value.reps),
      set_prescription: null,
    });
  };

  return (
    <div className="space-y-3">
      <div className={useDetailed ? 'max-w-32' : 'grid max-w-sm grid-cols-2 gap-4'}>
        <div>
          <Label>Series</Label>
          <Input
            type="number"
            value={value.sets}
            onChange={(e) => {
              const nextSets = parsePositiveInt(e.target.value, value.sets);
              if (useDetailed) {
                const defaultReps = defaultRepsFromPrescription(value.set_prescription, value.reps);
                onChange({
                  ...value,
                  sets: nextSets,
                  set_prescription: resizeSetPrescription(
                    value.set_prescription ?? [],
                    nextSets,
                    defaultReps
                  ),
                });
                return;
              }
              onChange({ ...value, sets: nextSets, set_prescription: null });
            }}
          />
        </div>
        {!useDetailed && (
          <div>
            <Label>Reps / duración (seg)</Label>
            <Input
              type="number"
              value={value.reps}
              onChange={(e) => {
                onChange({
                  ...value,
                  reps: parsePositiveInt(e.target.value, value.reps),
                  set_prescription: null,
                });
              }}
            />
            <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
              Mismo valor en todas las series. Para planchas u otros por tiempo, usa segundos.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-zinc-200 px-3 py-2.5 dark:border-zinc-700">
        <input
          id="routine-exercise-detailed-prescription"
          type="checkbox"
          className="text-brand focus:ring-brand mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-zinc-600"
          checked={useDetailed}
          onChange={(e) => {
            if (e.target.checked) enableDetailed();
            else disableDetailed();
          }}
        />
        <label htmlFor="routine-exercise-detailed-prescription" className="min-w-0 cursor-pointer">
          <span className="block text-xs font-medium text-zinc-800 dark:text-zinc-200">
            Prescripción por serie (peso y reps)
          </span>
          <span className="mt-0.5 block text-[10px] text-zinc-500 dark:text-zinc-400">
            Actívalo para seguir cargas o variar reps entre series. Si no, basta con series y reps
            generales.
          </span>
        </label>
      </div>

      {useDetailed && (
        <SetPrescriptionEditor
          sets={value.sets}
          defaultReps={defaultRepsFromPrescription(value.set_prescription, value.reps)}
          value={value.set_prescription ?? resizeSetPrescription([], value.sets, value.reps)}
          onChange={(set_prescription) => {
            onChange({
              ...value,
              reps: defaultRepsFromPrescription(set_prescription, value.reps),
              set_prescription,
            });
          }}
        />
      )}
    </div>
  );
}
