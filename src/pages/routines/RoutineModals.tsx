import React from 'react';
import { Button, Modal, Label, Input, DifficultySelect } from '../../components/ui';
import { AssignRoutineForm } from '../../components/routines/AssignRoutineForm';
import { ExercisePicker } from '../../components/exercise/ExercisePicker';
import { RoutineExercisePrescriptionFields } from '../../components/exercise/RoutineExercisePrescriptionFields';
import { parseNonNegativeInt } from '../../lib/parseFormNumber';
import type { RoutineExerciseForm } from '../../lib/routineExercisePayload';
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
  membersLoading?: boolean;
  membersError?: unknown;
  onCreateMember?: () => void;
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
  membersLoading = false,
  membersError,
  onCreateMember,
}: RoutineModalsProps) {
  return (
    <>
      <Modal
        open={isAssigningFromCalendar}
        onClose={() => {
          setIsAssigningFromCalendar(false);
        }}
        initialFocus="dialog"
        title={assignSingleDay ? 'Asignar para un día' : 'Asignar rutina'}
      >
        <AssignRoutineForm
          value={assignForm}
          onChange={setAssignForm}
          onSubmit={handleQuickAssign}
          members={members}
          routines={filteredRoutines}
          singleDay={assignSingleDay}
          selectedMemberShift={selectedMemberShift}
          availableTrainers={availableTrainers}
          membersLoading={membersLoading}
          membersError={membersError}
          onCreateMember={onCreateMember}
        />
      </Modal>

      <Modal
        open={isCreating}
        onClose={() => {
          setIsCreating(false);
        }}
        title="Nueva rutina"
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
        title="Editar rutina"
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
        initialFocus="dialog"
        title="Añadir ejercicio"
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
          <RoutineExercisePrescriptionFields
            formKey="add-exercise"
            value={newExercise}
            onChange={(prescription) => {
              setNewExercise({ ...newExercise, ...prescription });
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
        initialFocus="dialog"
        title={editingExercise ? `Editar ${editingExercise.name}` : 'Editar ejercicio'}
        maxWidth="xl"
        scrollable
      >
        {editingExercise && (
          <div className="space-y-4">
            <RoutineExercisePrescriptionFields
              formKey={`edit-${editingExercise.routine_exercise_id}`}
              value={editingExercise}
              onChange={(prescription) => {
                setEditingExercise({ ...editingExercise, ...prescription });
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
