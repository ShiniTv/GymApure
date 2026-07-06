import React from 'react';
import { UserPlus } from 'lucide-react';
import { Button, Modal, Label, Input, Select, DifficultySelect } from '../../components/ui';
import { ExercisePicker } from '../../components/exercise/ExercisePicker';
import { SetPrescriptionEditor } from '../../components/exercise/SetPrescriptionEditor';
import { formatDifficulty } from '../../lib/utils';
import { SHIFT_LABELS } from '../../lib/trainingShift';
import { parseNonNegativeInt, parsePositiveInt } from '../../lib/parseFormNumber';
import type { RoutineExerciseForm } from '../../lib/routineExercisePayload';
import { resizeSetPrescription } from '../../lib/setPrescription';
import type { Routine, RoutineExercise, Member, ExerciseOption } from './types';
import type { TrainingShift } from '../../lib/trainingShift';

export interface RoutineModalsProps {
  isAssigningFromCalendar: boolean;
  setIsAssigningFromCalendar: (open: boolean) => void;
  assignSingleDay?: boolean;
  assignForm: {
    user_id: string;
    routine_id: string;
    start_date: string;
    end_date: string;
  };
  setAssignForm: React.Dispatch<
    React.SetStateAction<{
      user_id: string;
      routine_id: string;
      start_date: string;
      end_date: string;
    }>
  >;
  members: Member[];
  routines: Routine[];
  handleQuickAssign: () => void;
  isCreating: boolean;
  setIsCreating: (open: boolean) => void;
  newRoutine: { name: string; difficulty: string };
  setNewRoutine: React.Dispatch<React.SetStateAction<{ name: string; difficulty: string }>>;
  handleCreateRoutine: () => void;
  editingRoutine: Routine | null;
  setEditingRoutine: (routine: Routine | null) => void;
  handleUpdateRoutine: () => void;
  isAddingExercise: boolean;
  setIsAddingExercise: (open: boolean) => void;
  availableExercises: ExerciseOption[];
  newExercise: RoutineExerciseForm;
  setNewExercise: React.Dispatch<React.SetStateAction<RoutineExerciseForm>>;
  handleAddWorkoutExercise: () => void;
  addExerciseError: string | null;
  editExerciseError: string | null;
  isEditingExercise: boolean;
  setIsEditingExercise: (open: boolean) => void;
  editingExercise: RoutineExercise | null;
  setEditingExercise: React.Dispatch<React.SetStateAction<RoutineExercise | null>>;
  handleUpdateExercise: () => void;
  deleteRoutineTarget: Routine | null;
  setDeleteRoutineTarget: (routine: Routine | null) => void;
  deleteRoutineError: string | null;
  deletingRoutine: boolean;
  confirmDeleteRoutine: () => void;
  deleteExerciseTarget: { routineId: number; exercise: RoutineExercise } | null;
  setDeleteExerciseTarget: (
    target: { routineId: number; exercise: RoutineExercise } | null
  ) => void;
  deletingExercise: boolean;
  confirmDeleteExercise: () => void;
  filteredRoutines: Routine[];
  selectedMemberShift: TrainingShift | null;
  availableTrainers: { id: number; full_name: string }[];
}

export function RoutineModals({
  isAssigningFromCalendar,
  setIsAssigningFromCalendar,
  assignSingleDay = false,
  assignForm,
  setAssignForm,
  members,
  routines: _routines,
  handleQuickAssign,
  isCreating,
  setIsCreating,
  newRoutine,
  setNewRoutine,
  handleCreateRoutine,
  editingRoutine,
  setEditingRoutine,
  handleUpdateRoutine,
  isAddingExercise,
  setIsAddingExercise,
  availableExercises,
  newExercise,
  setNewExercise,
  handleAddWorkoutExercise,
  addExerciseError,
  editExerciseError,
  isEditingExercise,
  setIsEditingExercise,
  editingExercise,
  setEditingExercise,
  handleUpdateExercise,
  deleteRoutineTarget,
  setDeleteRoutineTarget,
  deleteRoutineError,
  deletingRoutine,
  confirmDeleteRoutine,
  deleteExerciseTarget,
  setDeleteExerciseTarget,
  deletingExercise,
  confirmDeleteExercise,
  filteredRoutines,
  selectedMemberShift,
  availableTrainers,
}: RoutineModalsProps) {
  return (
    <>
      <Modal
        open={isAssigningFromCalendar}
        onClose={() => {
          setIsAssigningFromCalendar(false);
        }}
        title={
          <>
            ASIGNAR <span className="text-brand">RUTINA</span>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Seleccionar Miembro</Label>
            <Select
              value={assignForm.user_id}
              onChange={(e) => {
                setAssignForm({ ...assignForm, user_id: e.target.value, routine_id: '' });
              }}
            >
              <option value="">Selección...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                  {m.training_shift ? ` (${SHIFT_LABELS[m.training_shift].split(' / ')[0]})` : ''}
                </option>
              ))}
            </Select>
            {selectedMemberShift && (
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                Turno del miembro:{' '}
                <span className="text-brand font-semibold">
                  {SHIFT_LABELS[selectedMemberShift]}
                </span>
              </p>
            )}
          </div>
          <div>
            <Label>Seleccionar Rutina</Label>
            <Select
              className="font-mono text-sm"
              value={assignForm.routine_id}
              onChange={(e) => {
                setAssignForm({ ...assignForm, routine_id: e.target.value });
              }}
            >
              <option value="">Selección...</option>
              {filteredRoutines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({formatDifficulty(r.difficulty)})
                  {r.trainer_name ? ` — ${r.trainer_name}` : ''}
                </option>
              ))}
            </Select>
            {selectedMemberShift && (
              <div className="border-brand/20 bg-brand/5 mt-2 rounded-lg border px-3 py-2">
                <p className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Disponibles en {SHIFT_LABELS[selectedMemberShift].split(' / ')[0]}:
                </p>
                <p className="text-brand mt-0.5 text-xs font-bold">
                  {availableTrainers.length > 0
                    ? availableTrainers.map((t) => t.full_name).join(', ')
                    : 'Ningún entrenador asignado a este turno'}
                </p>
              </div>
            )}
            {selectedMemberShift && filteredRoutines.length === 0 && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                No hay rutinas de entrenadores en el turno{' '}
                {SHIFT_LABELS[selectedMemberShift].split(' / ')[0]}.
              </p>
            )}
          </div>
          <div className={assignSingleDay ? 'space-y-2' : 'grid grid-cols-2 gap-4'}>
            <div>
              <Label>{assignSingleDay ? 'Fecha' : 'Inicio'}</Label>
              <Input
                type="date"
                value={assignForm.start_date}
                readOnly={assignSingleDay}
                onChange={(e) => {
                  const nextStart = e.target.value;
                  setAssignForm({
                    ...assignForm,
                    start_date: nextStart,
                    ...(assignSingleDay ? { end_date: nextStart } : {}),
                  });
                }}
              />
            </div>
            {!assignSingleDay && (
              <div>
                <Label>Fin</Label>
                <Input
                  type="date"
                  value={assignForm.end_date}
                  onChange={(e) => {
                    setAssignForm({ ...assignForm, end_date: e.target.value });
                  }}
                />
              </div>
            )}
            {assignSingleDay && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Asignación para un solo día en el calendario.
              </p>
            )}
          </div>
          <Button
            variant="secondary"
            className="w-full"
            size="lg"
            onClick={handleQuickAssign}
            disabled={!assignForm.user_id || !assignForm.routine_id}
          >
            <UserPlus className="h-5 w-5" />
            Asignar Rutina
          </Button>
        </div>
      </Modal>

      <Modal
        open={isCreating}
        onClose={() => {
          setIsCreating(false);
        }}
        title={
          <>
            NUEVA <span className="text-brand">RUTINA</span>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Nombre de la Rutina</Label>
            <Input
              type="text"
              value={newRoutine.name}
              onChange={(e) => {
                setNewRoutine({ ...newRoutine, name: e.target.value });
              }}
              placeholder="Ej: Full Body"
            />
          </div>
          <div>
            <Label>Dificultad</Label>
            <DifficultySelect
              className="tracking-tighter uppercase"
              value={newRoutine.difficulty}
              onChange={(value) => {
                setNewRoutine({ ...newRoutine, difficulty: value });
              }}
            />
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={handleCreateRoutine}
            disabled={!newRoutine.name}
          >
            Crear Rutina
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!editingRoutine}
        onClose={() => {
          setEditingRoutine(null);
        }}
        title="Editar Rutina"
      >
        {editingRoutine && (
          <div className="space-y-4">
            <div>
              <Label>Nombre de la Rutina</Label>
              <Input
                type="text"
                value={editingRoutine.name}
                onChange={(e) => {
                  setEditingRoutine({ ...editingRoutine, name: e.target.value });
                }}
              />
            </div>
            <div>
              <Label>Dificultad</Label>
              <DifficultySelect
                value={editingRoutine.difficulty}
                onChange={(value) => {
                  setEditingRoutine({ ...editingRoutine, difficulty: value });
                }}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setEditingRoutine(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpdateRoutine}
                disabled={!editingRoutine.name}
              >
                Guardar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={isAddingExercise}
        onClose={() => {
          setIsAddingExercise(false);
        }}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Series</Label>
              <Input
                type="number"
                value={newExercise.sets}
                onChange={(e) => {
                  const nextSets = parsePositiveInt(e.target.value, newExercise.sets);
                  setNewExercise({
                    ...newExercise,
                    sets: nextSets,
                    set_prescription: resizeSetPrescription(
                      newExercise.set_prescription ?? [],
                      nextSets,
                      newExercise.reps
                    ),
                  });
                }}
              />
            </div>
            <div>
              <Label>Reps</Label>
              <Input
                type="number"
                value={newExercise.reps}
                onChange={(e) => {
                  const nextReps = parsePositiveInt(e.target.value, newExercise.reps);
                  setNewExercise({
                    ...newExercise,
                    reps: nextReps,
                    set_prescription: resizeSetPrescription(
                      newExercise.set_prescription ?? [],
                      newExercise.sets,
                      nextReps
                    ),
                  });
                }}
              />
            </div>
          </div>
          <SetPrescriptionEditor
            sets={newExercise.sets}
            defaultReps={newExercise.reps}
            value={
              newExercise.set_prescription ??
              resizeSetPrescription([], newExercise.sets, newExercise.reps)
            }
            onChange={(set_prescription) => {
              setNewExercise({ ...newExercise, set_prescription });
            }}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
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
              <Label>Sugerencia</Label>
              <Input
                type="text"
                placeholder="Ej: Pesado"
                value={newExercise.weight_suggestion}
                onChange={(e) => {
                  setNewExercise({ ...newExercise, weight_suggestion: e.target.value });
                }}
              />
            </div>
          </div>
          {addExerciseError && <p className="text-sm text-red-500">{addExerciseError}</p>}
          <Button
            className="w-full"
            onClick={handleAddWorkoutExercise}
            disabled={!newExercise.exercise_id}
          >
            Añadir Ejercicio
          </Button>
        </div>
      </Modal>

      <Modal
        open={isEditingExercise && !!editingExercise}
        onClose={() => {
          setIsEditingExercise(false);
        }}
        title={editingExercise ? `Editar ${editingExercise.name}` : 'Editar Ejercicio'}
        maxWidth="xl"
        scrollable
      >
        {editingExercise && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Series</Label>
                <Input
                  type="number"
                  value={editingExercise.sets}
                  onChange={(e) => {
                    const nextSets = parsePositiveInt(e.target.value, editingExercise.sets);
                    setEditingExercise({
                      ...editingExercise,
                      sets: nextSets,
                      set_prescription: resizeSetPrescription(
                        editingExercise.set_prescription ?? [],
                        nextSets,
                        editingExercise.reps
                      ),
                    });
                  }}
                />
              </div>
              <div>
                <Label>Reps</Label>
                <Input
                  type="number"
                  value={editingExercise.reps}
                  onChange={(e) => {
                    const nextReps = parsePositiveInt(e.target.value, editingExercise.reps);
                    setEditingExercise({
                      ...editingExercise,
                      reps: nextReps,
                      set_prescription: resizeSetPrescription(
                        editingExercise.set_prescription ?? [],
                        editingExercise.sets,
                        nextReps
                      ),
                    });
                  }}
                />
              </div>
            </div>
            <SetPrescriptionEditor
              sets={editingExercise.sets}
              defaultReps={editingExercise.reps}
              value={
                editingExercise.set_prescription ??
                resizeSetPrescription([], editingExercise.sets, editingExercise.reps)
              }
              onChange={(set_prescription) => {
                setEditingExercise({ ...editingExercise, set_prescription });
              }}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
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
                <Label>Sugerencia</Label>
                <Input
                  type="text"
                  value={editingExercise.weight_suggestion}
                  onChange={(e) => {
                    setEditingExercise({ ...editingExercise, weight_suggestion: e.target.value });
                  }}
                />
              </div>
            </div>
            {editExerciseError && <p className="text-sm text-red-500">{editExerciseError}</p>}
            <Button className="w-full" onClick={handleUpdateExercise}>
              Guardar Cambios
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        open={!!deleteRoutineTarget}
        onClose={() => !deletingRoutine && setDeleteRoutineTarget(null)}
        title="Eliminar rutina"
      >
        <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
          ¿Eliminar <strong>{deleteRoutineTarget?.name}</strong>?
        </p>
        <p className="mb-6 text-xs text-zinc-500">
          Se eliminará la plantilla y todo el historial asociado. Esta acción no se puede deshacer.
        </p>
        {deleteRoutineError && <p className="mb-4 text-sm text-red-500">{deleteRoutineError}</p>}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => {
              setDeleteRoutineTarget(null);
            }}
            disabled={deletingRoutine}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={confirmDeleteRoutine}
            disabled={deletingRoutine}
          >
            {deletingRoutine ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!deleteExerciseTarget}
        onClose={() => !deletingExercise && setDeleteExerciseTarget(null)}
        title="Quitar ejercicio"
      >
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          ¿Quitar <strong>{deleteExerciseTarget?.exercise.name}</strong> de esta plantilla?
        </p>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => {
              setDeleteExerciseTarget(null);
            }}
            disabled={deletingExercise}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={confirmDeleteExercise}
            disabled={deletingExercise}
          >
            {deletingExercise ? 'Quitando...' : 'Quitar'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
