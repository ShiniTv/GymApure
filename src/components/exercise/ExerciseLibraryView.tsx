import { useState } from 'react';
import { BookOpen, Dumbbell, Video, ChevronRight, Edit, Trash2 } from 'lucide-react';
import type { Exercise } from '../../hooks/queries/useExercisesQuery';
import { Card, Badge, EmptyState, Button } from '../ui';
import { filterExercises } from '../../lib/exerciseMuscleGroups';
import { ExerciseVideoPlayer } from './ExerciseVideoPlayer';

interface ExerciseLibraryViewProps {
  exercises: Exercise[];
  readOnly?: boolean;
  search: string;
  onEdit?: (exercise: Exercise) => void;
  onDelete?: (exercise: Exercise) => void;
  onCreate?: () => void;
}

export function ExerciseLibraryView({
  exercises,
  readOnly = false,
  search,
  onEdit,
  onDelete,
  onCreate,
}: ExerciseLibraryViewProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const filteredExercises = filterExercises(exercises, { search });

  if (filteredExercises.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title={search ? 'Sin resultados' : 'Sin ejercicios'}
        description={
          search
            ? `No hay ejercicios que coincidan con «${search}».`
            : readOnly
              ? 'Tu entrenador aún no ha publicado ejercicios en la biblioteca.'
              : 'Agrega movimientos al catálogo para usarlos en tus rutinas.'
        }
        action={
          !readOnly && !search && onCreate ? (
            <Button onClick={onCreate}>Nuevo ejercicio</Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
      {filteredExercises.map((exercise) => (
        <Card
          key={exercise.id}
          padding="sm"
          rounded="xl"
          className={`group transition-colors ${expandedId === exercise.id ? 'ring-brand/20 ring-2 sm:col-span-2 xl:col-span-3' : ''}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <div className="bg-brand/10 shrink-0 rounded-lg p-2">
                <Dumbbell className="text-brand dark:text-brand h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm leading-tight font-bold text-zinc-900 sm:text-base dark:text-white">
                  {exercise.name}
                </h3>
                <Badge variant="default" className="mt-1 text-[10px]">
                  {exercise.muscle_group}
                </Badge>
              </div>
            </div>
            {!readOnly && onEdit && onDelete && (
              <div className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  onClick={() => onEdit(exercise)}
                  className="hover:text-brand hover:bg-brand/10 inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-all dark:text-zinc-300"
                  aria-label={`Editar ${exercise.name}`}
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(exercise)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-all hover:bg-red-500/10 hover:text-red-500 dark:text-zinc-300"
                  aria-label={`Eliminar ${exercise.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {exercise.description && (
            <p
              className={`mt-2 text-xs leading-snug text-zinc-500 dark:text-zinc-400 ${expandedId === exercise.id ? '' : 'line-clamp-2'}`}
            >
              {exercise.description}
            </p>
          )}

          {expandedId === exercise.id && (
            <div className="animate-in slide-in-from-top-2 mt-3 space-y-3 border-t border-zinc-100 pt-3 duration-200 dark:border-zinc-800">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {exercise.video_url && (
                  <div className="space-y-3">
                    <h4 className="label-caps flex items-center gap-2">
                      <Video className="h-3 w-3" /> Video demostrativo
                    </h4>
                    <ExerciseVideoPlayer
                      url={exercise.video_url}
                      posterUrl={exercise.video_poster_url}
                      title={`${exercise.name} — video tutorial`}
                    />
                  </div>
                )}

                {exercise.execution && (
                  <div className="space-y-3">
                    <h4 className="label-caps flex items-center gap-2">
                      <BookOpen className="h-3 w-3" /> Guía de ejecución
                    </h4>
                    <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-800/50">
                      <div className="space-y-4">
                        {exercise.execution
                          .split('\n')
                          .filter((line) => line.trim())
                          .map((step, idx) => (
                            <div key={idx} className="flex gap-4">
                              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900">
                                {idx + 1}
                              </span>
                              <p className="pt-0.5 text-sm leading-relaxed font-medium text-zinc-600 dark:text-zinc-300">
                                {step.replace(/^\d+\.\s*/, '')}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setExpandedId(expandedId === exercise.id ? null : exercise.id);
              }}
              className={`inline-flex items-center justify-center gap-1 rounded-lg text-xs font-semibold transition-all ${
                expandedId === exercise.id
                  ? 'h-9 bg-zinc-900 px-3 text-white dark:bg-white dark:text-zinc-900'
                  : 'h-9 w-9 bg-zinc-100 text-zinc-500 hover:text-zinc-900 sm:w-auto sm:px-3 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-white'
              }`}
              aria-label={expandedId === exercise.id ? 'Cerrar detalles' : 'Ver detalles'}
              title={expandedId === exercise.id ? 'Cerrar' : 'Ver detalles'}
            >
              <ChevronRight
                className={`h-4 w-4 sm:hidden ${expandedId === exercise.id ? 'rotate-90' : ''}`}
              />
              <span className="hidden sm:inline">
                {expandedId === exercise.id ? 'Cerrar' : 'Ver detalles'}
              </span>
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
