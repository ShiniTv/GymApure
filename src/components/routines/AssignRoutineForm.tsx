import { UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { parseDateOnly } from '../../lib/dates';
import { SHIFT_LABELS, type TrainingShift } from '../../lib/trainingShift';
import { Button, Label, Input, Select, Spinner } from '../ui';
import { toDisplayErrorMessage } from '../../lib/api';
import { RoutinePicker } from './RoutinePicker';

export interface AssignRoutineFormValue {
  user_id: string;
  routine_id: string;
  start_date: string;
  end_date: string;
  scheduled_weekdays?: number[];
}

interface AssignRoutineOption {
  id: number;
  name: string;
  difficulty: string;
  trainer_name?: string;
}

interface AssignRoutineMemberOption {
  id: number;
  full_name: string;
  training_shift?: TrainingShift | null;
}

interface AssignRoutineFormProps {
  value: AssignRoutineFormValue;
  onChange: (value: AssignRoutineFormValue) => void;
  onSubmit: () => void;
  routines: AssignRoutineOption[];
  /** @deprecated singleDay is now always true. Kept for API compat but ignored. */
  singleDay?: boolean;
  members?: AssignRoutineMemberOption[];
  memberIdFixed?: string;
  assignedRoutineIds?: Set<number>;
  allowReassign?: boolean;
  selectedMemberShift?: TrainingShift | null;
  availableTrainers?: { id: number; full_name: string }[];
  submitDisabled?: boolean;
  submitLabel?: string;
  membersLoading?: boolean;
  membersError?: unknown;
  onCreateMember?: () => void;
}

export function AssignRoutineForm({
  value,
  onChange,
  onSubmit,
  routines,
  singleDay: _singleDay = true,
  members = [],
  memberIdFixed,
  assignedRoutineIds,
  allowReassign = false,
  selectedMemberShift = null,
  availableTrainers = [],
  submitDisabled = false,
  submitLabel = 'Asignar',
  membersLoading = false,
  membersError,
  onCreateMember,
}: AssignRoutineFormProps) {
  const routineOptions = allowReassign
    ? routines
    : routines.filter((r) => !assignedRoutineIds?.has(r.id));

  const singleDayLabel =
    value.start_date && format(parseDateOnly(value.start_date), 'EEE d MMM yyyy', { locale: es });

  const shiftShort = selectedMemberShift ? SHIFT_LABELS[selectedMemberShift].split(' / ')[0] : null;

  return (
    <div className="space-y-3">
      {!memberIdFixed && (
        <div>
          <Label>Miembro</Label>
          {membersLoading ? (
            <div className="text-text-muted flex items-center gap-2 py-2.5 text-xs">
              <Spinner className="h-4 w-4" />
              Cargando miembros…
            </div>
          ) : membersError ? (
            <p className="text-danger py-2 text-xs">
              {toDisplayErrorMessage(membersError, 'No se pudieron cargar los miembros')}
            </p>
          ) : members.length === 0 ? (
            <div className="border-border space-y-2 rounded-xl border border-dashed px-3 py-4 text-center">
              <p className="text-text-muted text-xs">No hay miembros registrados.</p>
              {onCreateMember && (
                <Button variant="secondary" size="sm" onClick={onCreateMember}>
                  Crear miembro
                </Button>
              )}
            </div>
          ) : (
            <>
              <Select
                value={value.user_id}
                onChange={(e) => {
                  onChange({ ...value, user_id: e.target.value, routine_id: '' });
                }}
              >
                <option value="">Elegir miembro…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                    {m.training_shift ? ` · ${SHIFT_LABELS[m.training_shift].split(' / ')[0]}` : ''}
                  </option>
                ))}
              </Select>
              {selectedMemberShift && (
                <p className="text-small text-text-muted mt-1">
                  Turno: {SHIFT_LABELS[selectedMemberShift]}
                  {availableTrainers.length > 0
                    ? ` · ${availableTrainers.map((t) => t.full_name).join(', ')}`
                    : ''}
                </p>
              )}
            </>
          )}
        </div>
      )}

      <RoutinePicker
        routines={routineOptions}
        value={value.routine_id}
        onChange={(routine_id) => onChange({ ...value, routine_id })}
        assignedRoutineIds={assignedRoutineIds}
        emptyHint={
          selectedMemberShift && routineOptions.length === 0
            ? `No hay rutinas de entrenadores en ${shiftShort}.`
            : 'Ninguna plantilla coincide'
        }
      />
      {selectedMemberShift && routineOptions.length === 0 ? (
        <p className="text-small text-warning -mt-1">
          No hay rutinas de entrenadores en {shiftShort}.
        </p>
      ) : null}

      <div className="space-y-2">
        {singleDayLabel ? (
          <p className="text-text-secondary text-xs font-medium capitalize">{singleDayLabel}</p>
        ) : null}
        <div>
          <Label>Fecha</Label>
          <Input
            type="date"
            value={value.start_date}
            onChange={(e) => {
              const nextStart = e.target.value;
              onChange({
                ...value,
                start_date: nextStart,
                end_date: nextStart,
              });
            }}
          />
        </div>
        <p className="text-small text-text-muted">Aparecerá solo este día en el calendario.</p>
      </div>

      <Button
        className="w-full"
        onClick={onSubmit}
        disabled={
          submitDisabled ||
          membersLoading ||
          !value.routine_id ||
          (!memberIdFixed && !value.user_id)
        }
        size="md"
      >
        <UserPlus className="h-4 w-4" />
        {submitLabel}
      </Button>
    </div>
  );
}
