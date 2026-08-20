import { Button, Label, Modal, Select } from '../../components/ui';

export type SkipExerciseReason = 'pain' | 'equipment_busy' | 'other';

const REASON_OPTIONS: { value: SkipExerciseReason; label: string }[] = [
  { value: 'pain', label: 'Molestia o dolor' },
  { value: 'equipment_busy', label: 'Equipo ocupado' },
  { value: 'other', label: 'Otro motivo' },
];

interface SkipExerciseModalProps {
  open: boolean;
  exerciseName: string;
  reason: SkipExerciseReason;
  note: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onReasonChange: (reason: SkipExerciseReason) => void;
  onNoteChange: (note: string) => void;
  onConfirm: () => void;
}

export function SkipExerciseModal({
  open,
  exerciseName,
  reason,
  note,
  saving,
  error,
  onClose,
  onReasonChange,
  onNoteChange,
  onConfirm,
}: SkipExerciseModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Saltar ejercicio" maxWidth="md">
      <div className="space-y-4">
        <p className="text-text-secondary text-sm">
          Hoy no harás <strong className="text-text font-semibold">{exerciseName}</strong>. Tu
          entrenador verá el motivo.
        </p>
        <div>
          <Label htmlFor="skip-reason">Motivo</Label>
          <Select
            id="skip-reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value as SkipExerciseReason)}
          >
            {REASON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="skip-note">Nota (opcional)</Label>
          <textarea
            id="skip-note"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            maxLength={300}
            rows={3}
            className="border-border bg-surface text-text focus:ring-brand mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            placeholder="Ej. hombro molesto en press inclinado"
          />
        </div>
        {error ? (
          <p className="text-danger text-sm font-medium" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={onConfirm} disabled={saving}>
            {saving ? 'Guardando…' : 'Saltar ejercicio'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
