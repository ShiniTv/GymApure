import { Button, Label, Modal, Select } from '../ui';
import type { ExerciseOption } from '../../pages/routines/types';

interface MemberSubstituteExerciseModalProps {
  open: boolean;
  exerciseName: string;
  muscleGroup: string;
  exercises: ExerciseOption[];
  selectedExerciseId: string;
  reason: string;
  saving: boolean;
  onClose: () => void;
  onExerciseChange: (id: string) => void;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
}

export function MemberSubstituteExerciseModal({
  open,
  exerciseName,
  muscleGroup,
  exercises,
  selectedExerciseId,
  reason,
  saving,
  onClose,
  onExerciseChange,
  onReasonChange,
  onConfirm,
}: MemberSubstituteExerciseModalProps) {
  const options = exercises
    .filter(
      (exercise) =>
        exercise.name !== exerciseName &&
        exercise.muscle_group.toLowerCase() === muscleGroup.toLowerCase()
    )
    .map((exercise) => ({ value: String(exercise.id), label: exercise.name }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Sustituir ${exerciseName}`}
      maxWidth="md"
      scrollable
    >
      <div className="space-y-4">
        <p className="text-text-secondary text-sm">
          Elige otro ejercicio de <strong className="text-text">{muscleGroup}</strong>. Tu
          entrenador puede ajustarlo después.
        </p>
        <div>
          <Label htmlFor="substitute-exercise">Nuevo ejercicio</Label>
          <Select
            id="substitute-exercise"
            value={selectedExerciseId}
            onChange={(e) => onExerciseChange(e.target.value)}
          >
            <option value="">Selecciona…</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="substitute-reason">Motivo</Label>
          <textarea
            id="substitute-reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={2}
            className="border-border bg-surface text-text focus:ring-brand mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            placeholder="Ej. máquina ocupada, prefiero mancuernas"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={saving || !selectedExerciseId || reason.trim().length < 2}
          >
            {saving ? 'Sustituyendo…' : 'Confirmar sustitución'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
