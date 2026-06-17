import React from 'react';
import { UserPlus } from 'lucide-react';
import { Button, Modal, Label, Input, Select, DifficultySelect } from '../../components/ui';
import { formatDifficulty } from '../../lib/utils';
import type {
  Routine,
  RoutineExercise,
  Member,
  ExerciseOption,
} from './types';

export interface RoutineModalsProps {
  isAssigningFromCalendar: boolean;
  setIsAssigningFromCalendar: (open: boolean) => void;
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
  newExercise: {
    exercise_id: string;
    sets: number;
    reps: number;
    rest_seconds: number;
    weight_suggestion: string;
  };
  setNewExercise: React.Dispatch<
    React.SetStateAction<{
      exercise_id: string;
      sets: number;
      reps: number;
      rest_seconds: number;
      weight_suggestion: string;
    }>
  >;
  handleAddWorkoutExercise: () => void;
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
}

export function RoutineModals({
  isAssigningFromCalendar,
  setIsAssigningFromCalendar,
  assignForm,
  setAssignForm,
  members,
  routines,
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
}: RoutineModalsProps) {
  return (
    <>
      <Modal
        open={isAssigningFromCalendar}
        onClose={() => setIsAssigningFromCalendar(false)}
        title={<>ASIGNAR <span className="text-orange-500">RUTINA</span></>}
      >
        <div className="space-y-4">
          <div>
            <Label>Seleccionar Miembro</Label>
            <Select
              value={assignForm.user_id}
              onChange={(e) => setAssignForm({ ...assignForm, user_id: e.target.value })}
            >
              <option value="">Selección...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Seleccionar Rutina</Label>
            <Select
              className="font-mono text-sm"
              value={assignForm.routine_id}
              onChange={(e) => setAssignForm({ ...assignForm, routine_id: e.target.value })}
            >
              <option value="">Selección...</option>
              {routines.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({formatDifficulty(r.difficulty)})</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Inicio</Label>
              <Input
                type="date"
                value={assignForm.start_date}
                onChange={(e) => setAssignForm({ ...assignForm, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Fin</Label>
              <Input
                type="date"
                value={assignForm.end_date}
                onChange={(e) => setAssignForm({ ...assignForm, end_date: e.target.value })}
              />
            </div>
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
        onClose={() => setIsCreating(false)}
        title={<>NUEVA <span className="text-orange-500">RUTINA</span></>}
      >
        <div className="space-y-4">
          <div>
            <Label>Nombre de la Rutina</Label>
            <Input
              type="text"
              value={newRoutine.name}
              onChange={(e) => setNewRoutine({ ...newRoutine, name: e.target.value })}
              placeholder="Ej: Full Body"
            />
          </div>
          <div>
            <Label>Dificultad</Label>
            <DifficultySelect
              className="uppercase tracking-tighter"
              value={newRoutine.difficulty}
              onChange={(value) => setNewRoutine({ ...newRoutine, difficulty: value })}
            />
          </div>
          <Button className="w-full" size="lg" onClick={handleCreateRoutine} disabled={!newRoutine.name}>
            Crear Rutina
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!editingRoutine}
        onClose={() => setEditingRoutine(null)}
        title="Editar Rutina"
      >
        {editingRoutine && (
          <div className="space-y-4">
            <div>
              <Label>Nombre de la Rutina</Label>
              <Input
                type="text"
                value={editingRoutine.name}
                onChange={(e) => setEditingRoutine({ ...editingRoutine, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Dificultad</Label>
              <DifficultySelect
                value={editingRoutine.difficulty}
                onChange={(value) => setEditingRoutine({ ...editingRoutine, difficulty: value })}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setEditingRoutine(null)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleUpdateRoutine} disabled={!editingRoutine.name}>
                Guardar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={isAddingExercise}
        onClose={() => setIsAddingExercise(false)}
        title="Añadir Ejercicio"
        maxWidth="xl"
        scrollable
      >
        <div className="space-y-4">
          <div>
            <Label>Seleccionar Ejercicio</Label>
            <Select
              value={newExercise.exercise_id}
              onChange={(e) => setNewExercise({ ...newExercise, exercise_id: e.target.value })}
            >
              <option value="">Selecciona un ejercicio...</option>
              {availableExercises.map((e) => (
                <option key={e.id} value={e.id}>{e.name} ({e.muscle_group})</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Series</Label>
              <Input
                type="number"
                value={newExercise.sets}
                onChange={(e) => setNewExercise({ ...newExercise, sets: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Reps</Label>
              <Input
                type="number"
                value={newExercise.reps}
                onChange={(e) => setNewExercise({ ...newExercise, reps: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Descanso (seg)</Label>
              <Input
                type="number"
                value={newExercise.rest_seconds}
                onChange={(e) => setNewExercise({ ...newExercise, rest_seconds: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Sugerencia</Label>
              <Input
                type="text"
                placeholder="Ej: Pesado"
                value={newExercise.weight_suggestion}
                onChange={(e) => setNewExercise({ ...newExercise, weight_suggestion: e.target.value })}
              />
            </div>
          </div>
          <Button className="w-full" onClick={handleAddWorkoutExercise} disabled={!newExercise.exercise_id}>
            Añadir Ejercicio
          </Button>
        </div>
      </Modal>

      <Modal
        open={isEditingExercise && !!editingExercise}
        onClose={() => setIsEditingExercise(false)}
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
                  onChange={(e) => setEditingExercise({ ...editingExercise, sets: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Reps</Label>
                <Input
                  type="number"
                  value={editingExercise.reps}
                  onChange={(e) => setEditingExercise({ ...editingExercise, reps: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Descanso (seg)</Label>
                <Input
                  type="number"
                  value={editingExercise.rest_seconds}
                  onChange={(e) => setEditingExercise({ ...editingExercise, rest_seconds: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Sugerencia</Label>
                <Input
                  type="text"
                  value={editingExercise.weight_suggestion}
                  onChange={(e) => setEditingExercise({ ...editingExercise, weight_suggestion: e.target.value })}
                />
              </div>
            </div>
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
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
          ¿Eliminar <strong>{deleteRoutineTarget?.name}</strong>?
        </p>
        <p className="text-xs text-zinc-500 mb-6">
          Se eliminará la plantilla y todo el historial asociado. Esta acción no se puede deshacer.
        </p>
        {deleteRoutineError && <p className="text-sm text-red-500 mb-4">{deleteRoutineError}</p>}
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setDeleteRoutineTarget(null)} disabled={deletingRoutine}>
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1" onClick={confirmDeleteRoutine} disabled={deletingRoutine}>
            {deletingRoutine ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!deleteExerciseTarget}
        onClose={() => !deletingExercise && setDeleteExerciseTarget(null)}
        title="Quitar ejercicio"
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          ¿Quitar <strong>{deleteExerciseTarget?.exercise.name}</strong> de esta plantilla?
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setDeleteExerciseTarget(null)} disabled={deletingExercise}>
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1" onClick={confirmDeleteExercise} disabled={deletingExercise}>
            {deletingExercise ? 'Quitando...' : 'Quitar'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
