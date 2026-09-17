import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export function ExerciseFocusNav({
  exercises,
  focusedIndex,
  completedExercises,
  onFocus,
}: {
  exercises: { id: number; name: string }[];
  focusedIndex: number;
  completedExercises: Record<number, boolean>;
  onFocus: (index: number) => void;
}) {
  if (exercises.length <= 1) return null;

  return (
    <nav
      className="border-border bg-bg fixed right-0 bottom-0 left-0 z-40 border-t px-3 py-0.5 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden"
      aria-label="Paginación de ejercicios"
    >
      <div className="mx-auto flex max-w-lg items-center gap-2">
        <button
          type="button"
          aria-label="Ejercicio anterior"
          className="tap-feedback border-border bg-surface-raised text-text flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-button)] border transition-colors disabled:opacity-40"
          disabled={focusedIndex === 0}
          onClick={() => onFocus(Math.max(0, focusedIndex - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-text-secondary truncate text-xs">{exercises[focusedIndex]?.name}</p>
          <p className="text-brand text-xs font-semibold">
            {focusedIndex + 1} / {exercises.length}
          </p>
          <div className="flex flex-wrap justify-center gap-0.5">
            {exercises.map((ex, i) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => onFocus(i)}
                className="flex h-3.5 min-w-3.5 items-center justify-center"
                aria-label={`Ejercicio ${i + 1}`}
                aria-current={i === focusedIndex ? 'true' : undefined}
              >
                <span
                  className={cn(
                    'rounded-full transition-[background-color,width,height] duration-150 [transition-timing-function:var(--ease-out)]',
                    i === focusedIndex ? 'bg-brand h-1.5 w-3.5' : 'bg-surface-overlay h-1.5 w-1.5',
                    completedExercises[ex.id] && i !== focusedIndex && 'bg-success/70'
                  )}
                />
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          aria-label="Siguiente ejercicio"
          className="tap-feedback border-border bg-surface-raised text-text flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-button)] border transition-colors disabled:opacity-40"
          disabled={focusedIndex >= exercises.length - 1}
          onClick={() => onFocus(Math.min(exercises.length - 1, focusedIndex + 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
