import { BookOpen } from 'lucide-react';
import { cn } from '../../lib/utils';

export function parseExecutionSteps(execution: string): string[] {
  const separator = execution.includes('|') ? '|' : '\n';
  return execution
    .split(separator)
    .map((line) => line.trim().replace(/^\d+\.\s*/, ''))
    .filter(Boolean);
}

interface ExerciseExecutionStepsProps {
  execution: string;
  className?: string;
  title?: string;
  showTitle?: boolean;
  compact?: boolean;
}

export function ExerciseExecutionSteps({
  execution,
  className,
  title = 'Pasos a seguir',
  showTitle = true,
  compact = false,
}: ExerciseExecutionStepsProps) {
  const steps = parseExecutionSteps(execution);
  if (steps.length === 0) return null;

  return (
    <div
      className={cn(
        compact
          ? 'bg-brand/5 dark:bg-brand/10 border-brand/20 rounded-2xl border p-4'
          : 'rounded-2xl border border-zinc-100 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-800/50',
        className
      )}
    >
      {showTitle && (
        <h4
          className={cn(
            'label-caps mb-3 flex items-center gap-2',
            compact ? 'text-brand dark:text-brand mb-2' : ''
          )}
        >
          <BookOpen className="h-3 w-3" />
          {title}
        </h4>
      )}
      <div className={cn('space-y-4', compact && 'space-y-3')}>
        {steps.map((step, idx) => (
          <div key={idx} className="flex gap-4">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900">
              {idx + 1}
            </span>
            <p
              className={cn(
                'pt-0.5 leading-relaxed font-medium text-zinc-600 dark:text-zinc-300',
                compact ? 'text-xs' : 'text-sm'
              )}
            >
              {step}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function executionStepCount(execution: string): number {
  return parseExecutionSteps(execution).length;
}
