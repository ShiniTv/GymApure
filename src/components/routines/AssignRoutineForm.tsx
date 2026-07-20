import { UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import { parseDateOnly } from '../../lib/dates';
import { formatDifficulty } from '../../lib/utils';
import { SHIFT_LABELS, type TrainingShift } from '../../lib/trainingShift';
import { Button, Label, Input, Select, Spinner } from '../ui';
import { toDisplayErrorMessage } from '../../lib/api';

export interface AssignRoutineFormValue {
  user_id: string;
  routine_id: string;
  start_date: string;
  end_date: string;
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
            <div className="flex items-center gap-2 py-2.5 text-xs text-zinc-500">
              <Spinner className="h-4 w-4" />
              Cargando miembros…
            </div>
          ) : membersError ? (
            <p className="py-2 text-xs text-red-500">
              {toDisplayErrorMessage(membersError, 'No se pudieron cargar los miembros')}
            </p>
          ) : members.length === 0 ? (
            <div className="space-y-2 rounded-xl border border-dashed border-zinc-200/80 px-3 py-4 text-center dark:border-zinc-700">
              <p className="text-xs text-zinc-500">No hay miembros registrados.</p>
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
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
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

      <div>
        <Label>Rutina</Label>
        <Select
          value={value.routine_id}
          onChange={(e) => {
            onChange({ ...value, routine_id: e.target.value });
          }}
        >
          <option value="">Elegir rutina…</option>
          {routineOptions.map((r) => {
            const isReassign = assignedRoutineIds?.has(r.id);
            return (
              <option key={r.id} value={r.id}>
                {r.name} · {formatDifficulty(r.difficulty)}
                {r.trainer_name ? ` · ${r.trainer_name}` : ''}
                {isReassign ? ' · reasignar' : ''}
              </option>
            );
          })}
        </Select>
        {selectedMemberShift && routineOptions.length === 0 && (
          <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
            No hay rutinas de entrenadores en {shiftShort}.
          </p>
        )}
      </div>

      <div className={singleDay ? 'space-y-2' : 'grid grid-cols-2 gap-3'}>
        {singleDay && singleDayLabel && (
          <p className="text-xs font-medium text-zinc-700 capitalize dark:text-zinc-300">
            {singleDayLabel}
          </p>
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
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Aparecerá solo este día en el calendario.
          </p>
        ) : (
          <p className="col-span-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            Periodo en que el miembro tendrá esta rutina activa.
          </p>
        )}
      </div>

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
