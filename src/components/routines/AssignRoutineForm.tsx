import { UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { parseDateOnly } from '../../lib/dates';
import { SHIFT_LABELS, type TrainingShift } from '../../lib/trainingShift';
import { Button, Label, Input, Select, Spinner } from '../ui';
import { toDisplayErrorMessage } from '../../lib/api';
import { cn } from '../../lib/utils';
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

const WEEKDAYS: [string, string][] = [
  ['L', 'Lunes'],
  ['M', 'Martes'],
  ['X', 'Miércoles'],
  ['J', 'Jueves'],
  ['V', 'Viernes'],
  ['S', 'Sábado'],
  ['D', 'Domingo'],
];

export function AssignRoutineForm({
  value,
  onChange,
  onSubmit,
  routines,
  singleDay = false,
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
                <Button variant="ghost" size="sm" onClick={onCreateMember}>
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

      <div className={singleDay ? 'space-y-2' : 'grid grid-cols-2 gap-3'}>
        {singleDay && singleDayLabel && (
          <p className="text-text-secondary text-xs font-medium capitalize">{singleDayLabel}</p>
        )}
        <div>
          <Label>{singleDay ? 'Fecha' : 'Inicio'}</Label>
          <Input
            type="date"
            value={value.start_date}
            onChange={(e) => {
              const nextStart = e.target.value;
              onChange({
                ...value,
                start_date: nextStart,
                ...(singleDay ? { end_date: nextStart } : {}),
              });
            }}
          />
        </div>
        {!singleDay && (
          <div>
            <Label>Fin</Label>
            <Input
              type="date"
              value={value.end_date}
              onChange={(e) => {
                onChange({ ...value, end_date: e.target.value });
              }}
            />
          </div>
        )}
        {singleDay ? (
          <p className="text-small text-text-muted">Aparecerá solo este día en el calendario.</p>
        ) : (
          <p className="text-small text-text-muted col-span-2">
            Periodo en que el miembro tendrá esta rutina activa.
          </p>
        )}
      </div>

      {!singleDay && (
        <fieldset>
          <legend className="text-text-secondary text-sm font-medium">Días programados</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {WEEKDAYS.map(([short, label], index) => {
              const day = index + 1;
              const selected = value.scheduled_weekdays?.includes(day) ?? false;
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={selected}
                  title={label}
                  onClick={() => {
                    const current = value.scheduled_weekdays ?? [];
                    const scheduled_weekdays = selected
                      ? current.filter((item) => item !== day)
                      : [...current, day].sort((a, b) => a - b);
                    onChange({ ...value, scheduled_weekdays });
                  }}
                  className={cn(
                    'text-small h-9 w-9 rounded-[var(--radius-chip)] font-semibold transition-colors',
                    selected
                      ? 'brand-solid'
                      : 'bg-surface-raised text-text-secondary hover:bg-surface-overlay'
                  )}
                >
                  {short}
                </button>
              );
            })}
          </div>
          <p className="text-small text-text-muted mt-1.5">
            Opcional. Si no eliges días, la rutina seguirá disponible todos los días.
          </p>
        </fieldset>
      )}

      <Button
        className="min-h-11 w-full"
        onClick={onSubmit}
        disabled={
          submitDisabled ||
          membersLoading ||
          !value.routine_id ||
          (!memberIdFixed && !value.user_id)
        }
      >
        <UserPlus className="h-4 w-4" />
        {submitLabel}
      </Button>
    </div>
  );
}
