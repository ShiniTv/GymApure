import React, { useState } from 'react';
import { Plus, Play, ChevronRight, Trash2, Edit, Settings2, Dumbbell } from 'lucide-react';
import { Button, Card, Spinner, EmptyState, SegmentedControl } from '../../components/ui';
import { formatDifficulty } from '../../lib/utils';
import type { Routine, RoutineExercise } from './types';

export interface RoutinesLibraryViewProps {
  loadingRoutines: boolean;
  routines: Routine[];
  userRole?: string;
  expandedRoutineId: number | null;
  onRoutineCardClick: (routineId: number) => void;
  onToggleExpandRoutine: (routineId: number) => void;
  onEditRoutine: (routine: Routine) => void;
  onDeleteRoutine: (routine: Routine) => void;
  onCreateRoutine: () => void;
  onAddExercise: () => void;
  onInlineUpdate: (
    routineId: number,
    exercise: RoutineExercise,
    field: 'sets' | 'reps',
    value: number
  ) => void;
  onEditExercise: (exercise: RoutineExercise) => void;
  onDeleteExercise: (routineId: number, exercise: RoutineExercise) => void;
}

export function RoutinesLibraryView({
  loadingRoutines,
  routines,
  userRole,
  expandedRoutineId,
  onRoutineCardClick,
  onToggleExpandRoutine,
  onEditRoutine,
  onDeleteRoutine,
  onCreateRoutine,
  onAddExercise,
  onInlineUpdate,
  onEditExercise,
  onDeleteExercise,
}: RoutinesLibraryViewProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const isTrainerView = userRole === 'trainer' || userRole === 'admin';

  if (loadingRoutines) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Spinner />
      </div>
    );
  }

  if (routines.length === 0) {
    const isMember = userRole === 'member';
    return (
      <EmptyState
        icon={Dumbbell}
        title={isMember ? 'Sin rutinas asignadas' : 'Sin plantillas de rutina'}
        description={
          isMember
            ? 'Tu entrenador aún no te asignó rutinas. Cuando lo haga, aparecerán aquí.'
            : 'Crea tu primera rutina para asignarla a tus miembros.'
        }
        action={
          !isMember ? (
            <Button onClick={onCreateRoutine}>
              <Plus className="h-4 w-4" />
              Crear rutina
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {isTrainerView && (
        <SegmentedControl
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: 'grid', label: 'Tarjetas' },
            { value: 'compact', label: 'Compacta' },
          ]}
        />
      )}
    <div className={viewMode === 'compact' ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}>
      {routines.map((routine) => (
        <Card
          key={routine.id}
          padding={viewMode === 'compact' ? 'sm' : 'none'}
          rounded="2xl"
          className={`flex flex-col overflow-hidden hover:border-orange-500/50 hover:shadow-lg transition-all ${expandedRoutineId === routine.id ? 'col-span-full ring-2 ring-orange-500/20' : ''}`}
        >
          <div
            onClick={() => onRoutineCardClick(routine.id)}
            className={`p-6 group ${userRole === 'member' || userRole === 'trainer' || userRole === 'admin' ? 'cursor-pointer' : ''}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl group-hover:bg-orange-500/10 transition-colors">
                <Play className="h-6 w-6 text-zinc-400 group-hover:text-orange-500" />
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                  routine.difficulty === 'Advanced' ? 'bg-red-500/10 text-red-600 dark:text-red-500' :
                  routine.difficulty === 'Intermediate' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500' :
                  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'
                }`}>
                  {formatDifficulty(routine.difficulty)}
                </span>
                {userRole === 'trainer' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditRoutine(routine);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
                      title="Configurar Rutina"
                    >
                      <Settings2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRoutine(routine);
                      }}
                      className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
                      title="Eliminar Rutina"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">{routine.name}</h3>
            <p className="text-xs text-zinc-500 mt-2 mb-6">{routine.exercise_count} ejercicios</p>

            <div className="flex items-center justify-between">
              {userRole === 'member' ? (
                <div className="flex items-center text-xs font-bold text-orange-600 dark:text-orange-500 group-hover:translate-x-1 transition-transform">
                  Empezar <ChevronRight className="h-4 w-4 ml-1" />
                </div>
              ) : (
                <div className="flex items-center text-xs font-bold text-zinc-500">
                  Toca para gestionar ejercicios
                </div>
              )}
              {(userRole === 'trainer' || userRole === 'admin') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void onToggleExpandRoutine(routine.id);
                  }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                    expandedRoutineId === routine.id
                      ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-orange-500 hover:text-orange-600'
                  }`}
                >
                  {expandedRoutineId === routine.id ? 'Cerrar' : 'Gestionar'}
                </button>
              )}
            </div>
          </div>

          {expandedRoutineId === routine.id && (
            <div className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-6 space-y-6 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Ejercicios de la Plantilla</h4>
                <button
                  onClick={onAddExercise}
                  className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-sm hover:scale-105 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Añadir
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {routine.exercises?.map((exercise) => (
                  <div key={exercise.routine_exercise_id} className="bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 p-4 rounded-2xl flex justify-between items-start shadow-sm hover:shadow-md transition-all">
                    <div>
                      <h5 className="font-bold text-zinc-900 dark:text-white text-sm">{exercise.name}</h5>
                      <p className="text-[10px] text-zinc-500 font-medium">{exercise.muscle_group}</p>
                      <div className="mt-3 grid grid-cols-2 gap-y-2 text-[11px]">
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          Sets:
                          <input
                            type="number"
                            className="w-10 bg-zinc-100 dark:bg-zinc-700 border-none rounded-md px-1 py-0.5 text-center font-bold text-zinc-900 dark:text-white focus:ring-1 focus:ring-orange-500"
                            defaultValue={exercise.sets}
                            onBlur={(e) => onInlineUpdate(routine.id, exercise, 'sets', parseInt(e.target.value))}
                            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          Reps:
                          <input
                            type="number"
                            className="w-10 bg-zinc-100 dark:bg-zinc-700 border-none rounded-md px-1 py-0.5 text-center font-bold text-zinc-900 dark:text-white focus:ring-1 focus:ring-orange-500"
                            defaultValue={exercise.reps}
                            onBlur={(e) => onInlineUpdate(routine.id, exercise, 'reps', parseInt(e.target.value))}
                            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                          />
                        </div>
                        <div className="text-zinc-500">Rst: <span className="text-zinc-900 dark:text-white font-bold">{exercise.rest_seconds}s</span></div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEditExercise(exercise)}
                        className="p-1.5 text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
                        title="Editar parámetros"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteExercise(routine.id, exercise)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Eliminar de la plantilla"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!routine.exercises || routine.exercises.length === 0) && (
                  <div className="col-span-full py-8 text-center text-zinc-400 text-xs italic border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl">
                    No hay ejercicios en esta plantilla
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
    </div>
  );
}
