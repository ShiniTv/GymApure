import { Button, Input, Label, Modal } from '../../components/ui';
import { parseNonNegativeInt } from '../../lib/parseFormNumber';
import {
  defaultRoutineExerciseForm,
  type RoutineExerciseForm,
} from '../../lib/routineExercisePayload';
import { RoutineExercisePrescriptionFields } from '../../components/exercise/RoutineExercisePrescriptionFields';
import { ExercisePicker } from '../../components/exercise/ExercisePicker';
import type { WorkoutExerciseOption } from '../../hooks/queries/useWorkoutRoutineQuery';

export function AddExerciseModal({
  open,
  exercises,
  exercisesLoading = false,
  value,
  error,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean;
  exercises: WorkoutExerciseOption[];
  exercisesLoading?: boolean;
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
      maxWidth="2xl"
      scrollable
    >
      <div className="space-y-4">
        <ExercisePicker
          exercises={exercises}
          loading={exercisesLoading}
          value={value.exercise_id}
          onChange={(exerciseId) => {
            onChange({ ...value, exercise_id: exerciseId });
          }}
        />
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
        {error && <p className="text-danger text-sm">{error}</p>}
        <Button className="w-full" onClick={onSubmit} disabled={!value.exercise_id}>
          Añadir a la rutina
        </Button>
      </div>
    </Modal>
  );
}

export { defaultRoutineExerciseForm };
