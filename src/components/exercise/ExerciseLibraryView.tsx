import { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import { exerciseHasVideo, type Exercise } from '../../hooks/queries/useExercisesQuery';
import { EmptyState, Button } from '../ui';
import { filterExercises, groupExercisesByMuscle } from '../../lib/exerciseMuscleGroups';
import { ExerciseListCard } from './ExerciseListCard';
import { ExerciseDetailModal } from './ExerciseDetailModal';

export type ExerciseLayoutView = 'flat' | 'groups';

const FLAT_VIRTUOSO_AT = 48;

interface ExerciseLibraryViewProps {
  exercises: Exercise[];
  readOnly?: boolean;
  search: string;
  muscleFilter?: string;
  videoOnly?: boolean;
  skipClientFilter?: boolean;
  layoutView?: ExerciseLayoutView;
  selectedExerciseId?: number | null;
  onSelectExercise?: (id: number) => void;
  onEdit?: (exercise: Exercise) => void;
  onDelete?: (exercise: Exercise) => void;
  onCreate?: () => void;
  onClearFilters?: () => void;
  columnsClassName?: string;
}

function ExerciseCardGrid({
  items,
  hideMuscle,
  readOnly,
  selectedExerciseId,
  onOpen,
  columnsClassName = 'grid min-w-0 gap-2.5 sm:grid-cols-2 sm:gap-3',
}: {
  items: Exercise[];
  hideMuscle: boolean;
  readOnly: boolean;
  selectedExerciseId?: number | null;
  onOpen: (id: number) => void;
  columnsClassName?: string;
}) {
  return (
    <div className={columnsClassName}>
      {items.map((exercise) => (
        <ExerciseListCard
          key={exercise.id}
          exercise={exercise}
          onOpen={onOpen}
          hideMuscle={hideMuscle}
          readOnly={readOnly}
          isSelected={selectedExerciseId === exercise.id}
        />
      ))}
    </div>
  );
}

export function ExerciseLibraryView({
  exercises,
  readOnly = false,
  search,
  muscleFilter = '',
  videoOnly = false,
  skipClientFilter = false,
  layoutView = 'flat',
  selectedExerciseId = null,
  onSelectExercise,
  onEdit,
  onDelete,
  onCreate,
  onClearFilters,
  columnsClassName,
}: ExerciseLibraryViewProps) {
  const [detailId, setDetailId] = useState<number | null>(null);
  const filteredExercises = skipClientFilter
    ? exercises
    : filterExercises(exercises, { search, muscleGroup: muscleFilter }).filter((e) =>
        videoOnly ? exerciseHasVideo(e) : true
      );
  const hasActiveFilters = Boolean(search.trim() || muscleFilter || videoOnly);
  const groups = groupExercisesByMuscle(filteredExercises);
  const hideMuscle = Boolean(muscleFilter) || layoutView === 'groups';

  if (filteredExercises.length === 0) {
    const emptyTitle = hasActiveFilters ? 'Sin resultados' : 'Sin ejercicios';
    const emptyDescription =
      videoOnly && !search.trim() && !muscleFilter
        ? 'Ningún ejercicio tiene video todavía.'
        : search.trim() && muscleFilter
          ? `Nada en ${muscleFilter} para «${search.trim()}». Prueba otro filtro.`
          : search.trim()
            ? `No hay ejercicios que coincidan con «${search.trim()}».`
            : muscleFilter
              ? `No hay ejercicios de ${muscleFilter} todavía.`
              : readOnly
                ? 'Tu entrenador aún no ha publicado ejercicios en la biblioteca.'
                : 'Agrega movimientos al catálogo para usarlos en tus rutinas.';

    return (
      <div className="mx-auto w-full max-w-md">
        <EmptyState
          compact
          variant={readOnly ? 'motivational' : 'default'}
          icon={Dumbbell}
          title={emptyTitle}
          description={emptyDescription}
          action={
            hasActiveFilters && onClearFilters ? (
              <Button size="sm" variant="secondary" onClick={onClearFilters}>
                Ver todos
              </Button>
            ) : !readOnly && !hasActiveFilters && onCreate ? (
              <Button size="sm" onClick={onCreate}>
                Nuevo ejercicio
              </Button>
            ) : undefined
          }
          className={readOnly ? 'border-0 bg-transparent shadow-none' : undefined}
        />
      </div>
    );
  }

  const handleOpenExercise = (id: number) => {
    onSelectExercise?.(id);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setDetailId(id);
    }
  };

  return (
    <>
      {layoutView === 'groups' ? (
        <div className="space-y-4 sm:space-y-5">
          {groups.map((group) => (
            <section key={group.muscle}>
              <div className="mb-2 flex items-center gap-2 px-0.5">
                <h3 className="text-text text-sm font-semibold">{group.muscle}</h3>
                <span className="bg-surface-overlay text-text-muted text-small rounded-md px-1.5 py-0.5 font-bold tabular-nums">
                  {group.items.length}
                </span>
              </div>
              <ExerciseCardGrid
                items={group.items}
                hideMuscle
                readOnly={readOnly}
                selectedExerciseId={selectedExerciseId}
                onOpen={handleOpenExercise}
                columnsClassName={columnsClassName}
              />
            </section>
          ))}
        </div>
      ) : filteredExercises.length >= FLAT_VIRTUOSO_AT ? (
        <Virtuoso
          style={{ height: 'min(70vh, 900px)' }}
          data={filteredExercises}
          className="rounded-xl"
          computeItemKey={(_index, exercise) => exercise.id}
          itemContent={(_index, exercise) => (
            <div className="pb-2 sm:pr-1">
              <ExerciseListCard
                exercise={exercise}
                onOpen={handleOpenExercise}
                hideMuscle={hideMuscle}
                readOnly={readOnly}
                isSelected={selectedExerciseId === exercise.id}
              />
            </div>
          )}
        />
      ) : (
        <ExerciseCardGrid
          items={filteredExercises}
          hideMuscle={hideMuscle}
          readOnly={readOnly}
          selectedExerciseId={selectedExerciseId}
          onOpen={handleOpenExercise}
          columnsClassName={columnsClassName}
        />
      )}

      <ExerciseDetailModal
        exerciseId={detailId}
        readOnly={readOnly}
        onClose={() => setDetailId(null)}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </>
  );
}
