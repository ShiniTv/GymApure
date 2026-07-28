import { lazy, Suspense } from 'react';
import { Button, Input, Label, Modal, Spinner } from '../../components/ui';
import { parseNonNegativeInt, parsePositiveInt } from '../../lib/parseFormNumber';
import {
  defaultRoutineExerciseForm,
  type RoutineExerciseForm,
} from '../../lib/routineExercisePayload';
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
      title="Añadir Ejercicio"
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Series</Label>
            <Input
              type="number"
              value={value.sets}
              onChange={(e) => {
                onChange({
                  ...value,
                  sets: parsePositiveInt(e.target.value, value.sets),
                });
              }}
            />
          </div>
          <div>
            <Label>Reps</Label>
            <Input
              type="number"
              value={value.reps}
              onChange={(e) => {
                onChange({
                  ...value,
                  reps: parsePositiveInt(e.target.value, value.reps),
                });
              }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
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
            <Label>Sugerencia</Label>
            <Input
              type="text"
              placeholder="Ej: Peso pesado"
              value={value.weight_suggestion}
              onChange={(e) => {
                onChange({ ...value, weight_suggestion: e.target.value });
              }}
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" onClick={onSubmit} disabled={!value.exercise_id}>
          Añadir a Rutina
        </Button>
      </div>
    </Modal>
  );
}

export { defaultRoutineExerciseForm };
