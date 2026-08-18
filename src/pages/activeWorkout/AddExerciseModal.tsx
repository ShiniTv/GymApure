import { lazy, Suspense } from 'react';
import { Button, Input, Label, Modal, Spinner } from '../../components/ui';
import { parseNonNegativeInt } from '../../lib/parseFormNumber';
import {
  defaultRoutineExerciseForm,
  type RoutineExerciseForm,
} from '../../lib/routineExercisePayload';
import { RoutineExercisePrescriptionFields } from '../../components/exercise/RoutineExercisePrescriptionFields';
import type { WorkoutExerciseOption } from '../../hooks/queries/useWorkoutRoutineQuery';

const ExercisePicker = lazy(() =>
  import('../../components/exercise/ExercisePicker').then((m) => ({ default: m.ExercisePicker }))
);

export function AddExerciseModal({
  open,
  exercises,
  value,
  error,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean;
  exercises: WorkoutExerciseOption[];
  value: RoutineExerciseForm;
  error: string | null;
  onClose: () => void;
  onChange: (next: RoutineExerciseForm) => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
      }}
      title="Añadir ejercicio"
      maxWidth="xl"
      scrollable
    >
      <div className="space-y-4">
        <Suspense
          fallback={
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          }
        >
          <ExercisePicker
            exercises={exercises}
            value={value.exercise_id}
            onChange={(exerciseId) => {
              onChange({ ...value, exercise_id: exerciseId });
            }}
          />
        </Suspense>
        {value.exercise_id ? (
          <>
            <RoutineExercisePrescriptionFields
              formKey={`workout-add-${value.exercise_id}`}
              selectedExerciseName={
                exercises.find((exercise) => String(exercise.id) === value.exercise_id)?.name
              }
              value={value}
              onChange={(prescription) => onChange({ ...value, ...prescription })}
            />
            <div className="max-w-[8rem]">
              <Label>Descanso (seg)</Label>
              <Input
                type="number"
                value={value.rest_seconds}
                onChange={(e) => {
                  onChange({
                    ...value,
                    rest_seconds: parseNonNegativeInt(e.target.value, value.rest_seconds),
                  });
                }}
              />
            </div>
            <div>
              <Label>Nota (opcional)</Label>
              <Input
                type="text"
                placeholder="Ej: tempo 3-1-1"
                value={value.weight_suggestion}
                onChange={(e) => {
                  onChange({ ...value, weight_suggestion: e.target.value });
                }}
              />
            </div>
          </>
        ) : null}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" onClick={onSubmit} disabled={!value.exercise_id}>
          Añadir a la rutina
        </Button>
      </div>
    </Modal>
  );
}

export { defaultRoutineExerciseForm };
