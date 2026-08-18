import type { Dispatch, SetStateAction } from 'react';
import { AssignRoutineForm } from '../../components/routines/AssignRoutineForm';
import { ExercisePicker } from '../../components/exercise/ExercisePicker';
import { RoutineExercisePrescriptionFields } from '../../components/exercise/RoutineExercisePrescriptionFields';
import { Button, DifficultySelect, Input, Label, Modal } from '../../components/ui';
import { parseNonNegativeInt } from '../../lib/parseFormNumber';
import type { RoutineExerciseForm } from '../../lib/routineExercisePayload';
import type { ExerciseLoadSuggestion } from '../../hooks/queries/useMemberRoutineQuery';
import type { Exercise, ExerciseOption, Routine, RoutineOption } from './types';

export interface AssignFormState {
  user_id: string;
  routine_id: string;
  start_date: string;
  end_date: string;
  scheduled_weekdays: number[];
}

interface MemberRoutineModalsProps {
  memberName: string;
  memberId: string | undefined;
  assignedRoutineIds: Set<number>;

  isCreating: boolean;
  isEditing: boolean;
  routineForm: { name: string; difficulty: string };
  onRoutineFormChange: (value: { name: string; difficulty: string }) => void;
  onCloseRoutineForm: () => void;
  onCreateRoutine: () => void;
  onUpdateRoutine: () => void;

  substitutionTarget: { routineId: number; exercise: Exercise } | null;
  availableExercises: ExerciseOption[];
  substitutionExerciseId: string;
  substitutionReason: string;
  substitutingExercise: boolean;
  onSubstitutionExerciseIdChange: (value: string) => void;
  onSubstitutionReasonChange: (value: string) => void;
  onCloseSubstitution: () => void;
  onConfirmSubstitution: () => void;

  isAddingExercise: boolean;
  newExercise: RoutineExerciseForm;
  setNewExercise: Dispatch<SetStateAction<RoutineExerciseForm>>;
  addExerciseError: string | null;
  onCloseAddExercise: () => void;
  onAddExercise: () => void;

  isEditingExercise: boolean;
  editingExercise: Exercise | null;
  setEditingExercise: Dispatch<SetStateAction<Exercise | null>>;
  loadSuggestion: ExerciseLoadSuggestion | null;
  loadingLoadSuggestion: boolean;
  editExerciseError: string | null;
  onCloseEditExercise: () => void;
  onApplyLastSessionLoad: () => void;
  onUpdateExercise: () => void;

  isAssigning: boolean;
  assignForm: AssignFormState;
  setAssignForm: Dispatch<SetStateAction<AssignFormState>>;
  availableRoutines: RoutineOption[];
  onCloseAssign: () => void;
  onAssignRoutine: () => void;

  unassignTarget: Routine | null;
  onCloseUnassign: () => void;
  onConfirmUnassign: (routineId: number) => void;

  deleteExerciseTarget: { routineId: number; exercise: Exercise } | null;
  onCloseDeleteExercise: () => void;
  onConfirmDeleteExercise: () => void;
}

export function MemberRoutineModals({
  memberName,
  memberId,
  assignedRoutineIds,
  isCreating,
  isEditing,
  routineForm,
  onRoutineFormChange,
  onCloseRoutineForm,
  onCreateRoutine,
  onUpdateRoutine,
  substitutionTarget,
  availableExercises,
  substitutionExerciseId,
  substitutionReason,
  substitutingExercise,
  onSubstitutionExerciseIdChange,
  onSubstitutionReasonChange,
  onCloseSubstitution,
  onConfirmSubstitution,
  isAddingExercise,
  newExercise,
  setNewExercise,
  addExerciseError,
  onCloseAddExercise,
  onAddExercise,
  isEditingExercise,
  editingExercise,
  setEditingExercise,
  loadSuggestion,
  loadingLoadSuggestion,
  editExerciseError,
  onCloseEditExercise,
  onApplyLastSessionLoad,
  onUpdateExercise,
  isAssigning,
  assignForm,
  setAssignForm,
  availableRoutines,
  onCloseAssign,
  onAssignRoutine,
  unassignTarget,
  onCloseUnassign,
  onConfirmUnassign,
  deleteExerciseTarget,
  onCloseDeleteExercise,
  onConfirmDeleteExercise,
}: MemberRoutineModalsProps) {
  return (
    <>
      <Modal
        open={isCreating || isEditing}
        onClose={onCloseRoutineForm}
        title={isCreating ? 'Crear Rutina' : 'Editar Rutina'}
      >
        <div className="space-y-4">
          <div>
            <Label>Nombre de la Rutina</Label>
            <Input
              type="text"
              value={routineForm.name}
              onChange={(e) => {
                onRoutineFormChange({ ...routineForm, name: e.target.value });
              }}
              placeholder="Ej: Piernas A"
            />
          </div>
          <div>
            <Label>Dificultad</Label>
            <DifficultySelect
              value={routineForm.difficulty}
              onChange={(difficulty) => {
                onRoutineFormChange({ ...routineForm, difficulty });
              }}
            />
          </div>
          <Button
            className="w-full"
            onClick={isCreating ? onCreateRoutine : onUpdateRoutine}
            disabled={!routineForm.name}
          >
            {isCreating ? 'Crear y Asignar' : 'Guardar Cambios'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!substitutionTarget}
        onClose={onCloseSubstitution}
        title={
          substitutionTarget
            ? `Sustituir ${substitutionTarget.exercise.name}`
            : 'Sustituir ejercicio'
        }
        maxWidth="xl"
        scrollable
      >
        {substitutionTarget && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Solo se muestran ejercicios del grupo{' '}
              <strong>{substitutionTarget.exercise.muscle_group}</strong> para conservar la
              intención del programa. Revisa las limitaciones de salud antes de confirmar.
            </p>
            <ExercisePicker
              label="Ejercicio sustituto"
              exercises={availableExercises.filter(
                (exercise) =>
                  exercise.id !== substitutionTarget.exercise.id &&
                  exercise.muscle_group.toLowerCase() ===
                    substitutionTarget.exercise.muscle_group.toLowerCase()
              )}
              value={substitutionExerciseId}
              onChange={onSubstitutionExerciseIdChange}
              placeholder="Buscar alternativa compatible..."
            />
            <div>
              <Label htmlFor="substitution-reason">Motivo de la sustitución</Label>
              <textarea
                id="substitution-reason"
                value={substitutionReason}
                onChange={(event) => onSubstitutionReasonChange(event.target.value)}
                className="mt-1 min-h-20 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                placeholder="Ej: limitación de rodilla; se conserva el patrón de empuje"
                maxLength={500}
              />
            </div>
            <Button
              className="w-full"
              onClick={onConfirmSubstitution}
              disabled={
                !substitutionExerciseId ||
                substitutionReason.trim().length < 2 ||
                substitutingExercise
              }
            >
              {substitutingExercise ? 'Sustituyendo…' : 'Confirmar sustitución'}
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        open={isAddingExercise}
        onClose={onCloseAddExercise}
        initialFocus="dialog"
        title="Añadir Ejercicio"
        maxWidth="xl"
        scrollable
      >
        <div className="space-y-4">
          <ExercisePicker
            exercises={availableExercises}
            value={newExercise.exercise_id}
            onChange={(exerciseId) => {
              setNewExercise({ ...newExercise, exercise_id: exerciseId });
            }}
          />
          {newExercise.exercise_id ? (
            <>
              <RoutineExercisePrescriptionFields
                formKey={`add-${newExercise.exercise_id}`}
                selectedExerciseName={
                  availableExercises.find(
                    (exercise) => String(exercise.id) === newExercise.exercise_id
                  )?.name
                }
                value={newExercise}
                onChange={(prescription) => {
                  setNewExercise({ ...newExercise, ...prescription });
                }}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="max-w-[8rem]">
                  <Label>Descanso (seg)</Label>
                  <Input
                    type="number"
                    value={newExercise.rest_seconds}
                    onChange={(e) => {
                      setNewExercise({
                        ...newExercise,
                        rest_seconds: parseNonNegativeInt(e.target.value, newExercise.rest_seconds),
                      });
                    }}
                  />
                </div>
                <div>
                  <Label>Nota (opcional)</Label>
                  <Input
                    type="text"
                    placeholder="Ej: tempo 3-1-1, no bloquear"
                    value={newExercise.weight_suggestion}
                    onChange={(e) => {
                      setNewExercise({ ...newExercise, weight_suggestion: e.target.value });
                    }}
                  />
                </div>
              </div>
            </>
          ) : null}
          {addExerciseError && <p className="text-sm text-red-500">{addExerciseError}</p>}
          <Button className="w-full" onClick={onAddExercise} disabled={!newExercise.exercise_id}>
            Añadir Ejercicio
          </Button>
        </div>
      </Modal>

      <Modal
        open={isEditingExercise && !!editingExercise}
        onClose={onCloseEditExercise}
        initialFocus="dialog"
        title={editingExercise ? `Editar ${editingExercise.name}` : 'Editar Ejercicio'}
        maxWidth="xl"
        scrollable
      >
        {editingExercise && (
          <div className="space-y-4">
            <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2.5">
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                Referencia de carga
              </p>
              {loadingLoadSuggestion ? (
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Consultando historial…
                </p>
              ) : loadSuggestion?.last_session ? (
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-300">
                    Última sesión:{' '}
                    <strong>
                      {loadSuggestion.last_session.weight} kg × {loadSuggestion.last_session.reps}
                    </strong>
                    {loadSuggestion.estimated_1rm_kg != null
                      ? ` · 1RM estimado ${loadSuggestion.estimated_1rm_kg} kg`
                      : ''}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8 px-2.5 text-xs"
                    onClick={onApplyLastSessionLoad}
                  >
                    Aplicar última sesión
                  </Button>
                </div>
              ) : loadSuggestion?.estimated_1rm_kg != null ? (
                <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                  1RM estimado: <strong>{loadSuggestion.estimated_1rm_kg} kg</strong>. Define la
                  intensidad según el objetivo del bloque.
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Sin sesiones previas ni pruebas RM registradas para este ejercicio.
                </p>
              )}
            </div>
            <RoutineExercisePrescriptionFields
              formKey={`edit-${editingExercise.routine_exercise_id}`}
              value={editingExercise}
              onChange={(prescription) => {
                setEditingExercise({ ...editingExercise, ...prescription });
              }}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="max-w-[8rem]">
                <Label>Descanso (seg)</Label>
                <Input
                  type="number"
                  value={editingExercise.rest_seconds}
                  onChange={(e) => {
                    setEditingExercise({
                      ...editingExercise,
                      rest_seconds: parseNonNegativeInt(
                        e.target.value,
                        editingExercise.rest_seconds
                      ),
                    });
                  }}
                />
              </div>
              <div>
                <Label>Nota (opcional)</Label>
                <Input
                  type="text"
                  value={editingExercise.weight_suggestion}
                  onChange={(e) => {
                    setEditingExercise({
                      ...editingExercise,
                      weight_suggestion: e.target.value,
                    });
                  }}
                />
              </div>
            </div>
            {editExerciseError && <p className="text-sm text-red-500">{editExerciseError}</p>}
            <Button className="w-full" onClick={onUpdateExercise}>
              Guardar Cambios
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        open={isAssigning}
        onClose={onCloseAssign}
        initialFocus="dialog"
        title="Asignar rutina"
      >
        <AssignRoutineForm
          value={assignForm}
          onChange={(next) =>
            setAssignForm({ ...next, scheduled_weekdays: next.scheduled_weekdays ?? [] })
          }
          onSubmit={onAssignRoutine}
          routines={availableRoutines}
          memberIdFixed={memberId}
          allowReassign
          assignedRoutineIds={assignedRoutineIds}
        />
      </Modal>

      <Modal open={!!unassignTarget} onClose={onCloseUnassign} title="Quitar rutina">
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          ¿Quitar <strong>{unassignTarget?.name}</strong> de {memberName}?
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onCloseUnassign}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => unassignTarget && onConfirmUnassign(unassignTarget.id)}
          >
            Quitar rutina
          </Button>
        </div>
      </Modal>

      <Modal open={!!deleteExerciseTarget} onClose={onCloseDeleteExercise} title="Quitar ejercicio">
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          ¿Quitar <strong>{deleteExerciseTarget?.exercise.name}</strong> de esta rutina?
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onCloseDeleteExercise}>
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1" onClick={onConfirmDeleteExercise}>
            Quitar
          </Button>
        </div>
      </Modal>
    </>
  );
}
