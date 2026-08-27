import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

export function RoutineExerciseOrderControls({
  index,
  total,
  name,
  onMove,
}: {
  index: number;
  total: number;
  name: string;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5">
      <span className="text-text-muted text-[11px] font-semibold tabular-nums" aria-hidden>
        {index + 1}
      </span>
      <button
        type="button"
        disabled={index === 0}
        onClick={() => onMove(-1)}
        className={cn(
          'text-text-muted hover:text-brand hover:bg-brand/10 inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
          'disabled:pointer-events-none disabled:opacity-30'
        )}
        aria-label={`Subir ${name} en el orden de ejecución`}
        title="Subir"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={index >= total - 1}
        onClick={() => onMove(1)}
        className={cn(
          'text-text-muted hover:text-brand hover:bg-brand/10 inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
          'disabled:pointer-events-none disabled:opacity-30'
        )}
        aria-label={`Bajar ${name} en el orden de ejecución`}
        title="Bajar"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}
