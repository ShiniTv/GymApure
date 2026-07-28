import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui';
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
      className="border-border bg-bg fixed right-0 bottom-0 left-0 z-40 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"
      aria-label="Paginación de ejercicios"
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          disabled={focusedIndex === 0}
          onClick={() => onFocus(Math.max(0, focusedIndex - 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-text-secondary truncate text-xs">{exercises[focusedIndex]?.name}</p>
          <p className="text-brand text-sm font-semibold">
            {focusedIndex + 1} / {exercises.length}
          </p>
          <div className="mt-1.5 flex flex-wrap justify-center gap-0.5">
            {exercises.map((ex, i) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => onFocus(i)}
                className="flex h-11 w-11 items-center justify-center"
                aria-label={`Ejercicio ${i + 1}`}
                aria-current={i === focusedIndex ? 'true' : undefined}
              >
                <span
                  className={cn(
                    'rounded-full transition-all',
                    i === focusedIndex ? 'bg-brand h-2.5 w-5' : 'bg-surface-overlay h-2.5 w-2.5',
                    completedExercises[ex.id] && i !== focusedIndex && 'bg-emerald-500/60'
                  )}
                />
              </button>
            ))}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          disabled={focusedIndex >= exercises.length - 1}
          onClick={() => onFocus(Math.min(exercises.length - 1, focusedIndex + 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </nav>
  );
}
