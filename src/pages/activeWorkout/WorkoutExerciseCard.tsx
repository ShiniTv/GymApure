import { lazy, Suspense, useState } from 'react';
import {
  BookOpen,
  CheckCircle,
  Edit2,
  Minus,
  Plus,
  SkipForward,
  Trash2,
  Video,
} from 'lucide-react';
import { Collapse, Input } from '../../components/ui';
import { formatMuscleGroupLabel } from '../../lib/exerciseMuscleGroups';
import { cn } from '../../lib/utils';
import { hapticLight, hapticSuccess } from '../../lib/haptics';
import {
  ExerciseExecutionSteps,
  executionStepCount,
} from '../../components/exercise/ExerciseExecutionSteps';
import { formatLastSetHint, getLastSetHint } from './setValues';
import { prescriptionEffort, prescriptionLoad } from '../../lib/setPrescription';
import type { WorkoutLogEntry } from './types';
import { workoutChipBtn } from './styles';
import type { WorkoutRoutine } from '../../hooks/queries/useWorkoutRoutineQuery';

const ExerciseVideoPlayer = lazy(() =>
  import('../../components/exercise/ExerciseVideoPlayer').then((m) => ({
    default: m.ExerciseVideoPlayer,
  }))
);

type Exercise = WorkoutRoutine['exercises'][number];

export function WorkoutExerciseCard({
  exercise,
  index,
  hidden,
  completed,
  logs,
  lastSessionLogs,
  onToggleComplete,
  onLogChange,
  onEditSet,
  onToggleSetComplete,
  onAddSet,
  onRemoveLastSet,
  onSkip,
}: {
  exercise: Exercise;
  index: number;
  hidden: boolean;
  completed: boolean;
  logs: Record<string, WorkoutLogEntry>;
  lastSessionLogs: Record<string, { weight: number; reps: number }>;
  onToggleComplete: () => void;
  onLogChange: (setNum: number, field: 'weight' | 'reps', value: string) => void;
  onEditSet: (setNum: number) => void;
  onToggleSetComplete: (setNum: number) => void;
  onAddSet: () => void;
  onRemoveLastSet: () => void;
  onSkip?: () => void;
}) {
  const load = prescriptionLoad(exercise.set_prescription);
  const effort = prescriptionEffort(exercise.set_prescription);
  const showLoad = load !== 'none';
  const loadHeader = load === 'plates' ? 'Placas' : 'kg';
  const effortHeader = effort === 'time' ? 'Seg' : 'Reps';
  const setGridClass = showLoad
    ? 'grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] sm:grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)_3rem]'
    : 'grid-cols-[2rem_minmax(0,1fr)_2.75rem] sm:grid-cols-[2.25rem_minmax(0,1fr)_3rem]';
  const [showVideo, setShowVideo] = useState(false);
  const [showExecution, setShowExecution] = useState(false);

  const handleQuickAdjust = (setNum: number, field: 'weight' | 'reps', delta: number) => {
    hapticLight();
    const key = `${exercise.id}-${setNum}`;
    const priorSet = getLastSetHint(exercise.id, setNum, lastSessionLogs);
    const rawVal = logs[key]?.[field];
    let current: number;
    if (rawVal !== undefined && rawVal !== '') {
      current = parseFloat(rawVal) || 0;
    } else {
      current = field === 'weight' ? (priorSet?.weight ?? 0) : exercise.reps;
    }
    const nextVal = Math.max(0, Math.round((current + delta) * 10) / 10);
    onLogChange(setNum, field, String(nextVal));
  };

  return (
    <article
      id={`active-workout-exercise-${exercise.id}`}
      className={cn(
        'rounded-card border-border bg-surface border p-3 transition-[background-color,border-color,color,box-shadow,opacity] duration-150 [transition-timing-function:var(--ease-out)] sm:p-4',
        completed ? 'scale-[0.99] opacity-55 ring-1 ring-emerald-500/40' : '',
        hidden && 'hidden'
      )}
    >
      <div className="mb-3 flex min-w-0 items-start gap-2.5">
        <span className="brand-solid mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold not-italic">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-2">
            <h3 className="text-text text-h2 min-w-0 flex-1 leading-snug font-semibold">
              <span className="break-words">{exercise.name}</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                if (!completed) hapticSuccess();
                else hapticLight();
                onToggleComplete();
              }}
              className={cn(
                'tap-feedback inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 [transition-timing-function:var(--ease-out)] active:scale-95',
                completed
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-900/20'
                  : 'bg-surface-overlay text-text-secondary can-hover:hover:bg-surface-raised can-hover:hover:text-text'
              )}
              aria-label={completed ? 'Marcar ejercicio como pendiente' : 'Completar ejercicio'}
              title={completed ? 'Hecho' : 'Completar ejercicio completo'}
            >
              <CheckCircle className="h-4 w-4" />
            </button>
            {onSkip && !completed ? (
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  onSkip();
                }}
                className="text-text-muted can-hover:hover:bg-surface-overlay can-hover:hover:text-text tap-feedback inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg transition-colors active:scale-95"
                aria-label={`Saltar o sustituir ${exercise.name}`}
                title="Saltar o equipo ocupado"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <p className="text-text-secondary mt-1 text-xs font-medium sm:text-sm">
            {formatMuscleGroupLabel(exercise.muscle_group)} · Descanso: {exercise.rest_seconds}s
          </p>
          {exercise.weight_suggestion && (
            <p className="text-brand mt-1 text-xs font-bold">
              Consejo: {exercise.weight_suggestion}
            </p>
          )}
        </div>
      </div>

      {(exercise.description || exercise.execution || exercise.video_url) && (
        <div className="mb-3 space-y-3">
          {exercise.description && (
            <p className="text-text-secondary text-xs italic">"{exercise.description}"</p>
          )}

          <div className="flex flex-wrap gap-2">
            {exercise.video_url && (
              <button
                type="button"
                onClick={() => setShowVideo((v) => !v)}
                className={workoutChipBtn}
              >
                <Video className="h-3.5 w-3.5" />
                {showVideo ? 'Cerrar video' : 'Video guía'}
              </button>
            )}

            {exercise.execution && (
              <button
                type="button"
                className={workoutChipBtn}
                onClick={() => setShowExecution((v) => !v)}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>{showExecution ? 'Ocultar' : 'Ver ejecución'}</span>
                <span className="bg-brand/10 text-brand dark:bg-brand/20 text-small rounded px-1.5 py-0.5 font-bold">
                  {executionStepCount(exercise.execution)} pasos
                </span>
              </button>
            )}
          </div>

          {exercise.execution && (
            <Collapse open={showExecution}>
              <ExerciseExecutionSteps
                execution={exercise.execution}
                compact
                className="w-full pt-1"
              />
            </Collapse>
          )}

          {exercise.video_url && (
            <Collapse open={showVideo}>
              <div className="w-full pt-1">
                <Suspense
                  fallback={<div className="bg-surface-overlay h-40 animate-pulse rounded-xl" />}
                >
                  <ExerciseVideoPlayer
                    url={exercise.video_url}
                    posterUrl={exercise.video_poster_url}
                    title={`${exercise.name} — video tutorial`}
                  />
                </Suspense>
              </div>
            </Collapse>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div
          className={cn(
            'text-text-muted text-small grid items-center gap-2 font-semibold tracking-wide uppercase',
            setGridClass
          )}
        >
          <div className="text-center">Serie</div>
          {showLoad ? <div className="text-center">{loadHeader}</div> : null}
          <div className="text-center">{effortHeader}</div>
          <div className="flex items-center justify-center" aria-hidden>
            <CheckCircle className="h-3.5 w-3.5" />
          </div>
        </div>

        {Array.from({ length: exercise.sets }).map((_, i) => {
          const setNum = i + 1;
          const key = `${exercise.id}-${setNum}`;
          const isCompleted = logs[key]?.completed;
          const priorSet = getLastSetHint(exercise.id, setNum, lastSessionLogs);
          const lastHintLabel =
            !isCompleted && priorSet ? formatLastSetHint(priorSet, load, effort) : null;
          const weightInputId = `workout-weight-${exercise.id}-${setNum}`;
          const repsInputId = `workout-reps-${exercise.id}-${setNum}`;

          return (
            <div
              key={setNum}
              className={cn(
                'grid items-center gap-2 rounded-lg px-0.5 py-1 transition-[background-color,border-color,color,box-shadow,opacity] duration-150 [transition-timing-function:var(--ease-out)]',
                setGridClass,
                isCompleted ? 'bg-emerald-500/5 opacity-85' : 'bg-transparent'
              )}
            >
              <div className="flex justify-center">
                <span className="border-border bg-surface-raised text-text flex h-10 w-8 items-center justify-center rounded-md border text-sm font-semibold tabular-nums sm:h-11 sm:w-9">
                  {setNum}
                </span>
              </div>
              {showLoad ? (
                <div className="min-w-0">
                  <div className="relative flex items-center">
                    {!isCompleted && (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() =>
                          handleQuickAdjust(setNum, 'weight', load === 'plates' ? -1 : -2.5)
                        }
                        className="text-text-muted hover:text-text hover:bg-surface-overlay tap-feedback absolute left-1 z-10 flex h-7 w-5 items-center justify-center rounded transition-transform active:scale-90"
                        aria-label={load === 'plates' ? 'Restar 1 placa' : 'Restar 2.5 kilos'}
                        title={load === 'plates' ? '-1 placa' : '-2.5 kg'}
                      >
                        <Minus className="h-3 w-3 stroke-[2.5]" />
                      </button>
                    )}
                    <Input
                      id={weightInputId}
                      type="number"
                      inputMode="decimal"
                      enterKeyHint="next"
                      placeholder={priorSet ? String(priorSet.weight) : '0'}
                      className={cn(
                        'min-h-10 text-center text-sm font-semibold tabular-nums sm:min-h-11 sm:text-base',
                        !isCompleted ? 'px-6' : 'px-2'
                      )}
                      value={logs[key]?.weight || ''}
                      onChange={(e) => onLogChange(setNum, 'weight', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          document.getElementById(repsInputId)?.focus();
                        }
                      }}
                      disabled={isCompleted}
                      aria-label={
                        load === 'plates' ? `Placas serie ${setNum}` : `Peso serie ${setNum}`
                      }
                    />
                    {!isCompleted && (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() =>
                          handleQuickAdjust(setNum, 'weight', load === 'plates' ? 1 : 2.5)
                        }
                        className="text-text-muted hover:text-text hover:bg-surface-overlay tap-feedback absolute right-1 z-10 flex h-7 w-5 items-center justify-center rounded transition-transform active:scale-90"
                        aria-label={load === 'plates' ? 'Sumar 1 placa' : 'Sumar 2.5 kilos'}
                        title={load === 'plates' ? '+1 placa' : '+2.5 kg'}
                      >
                        <Plus className="h-3 w-3 stroke-[2.5]" />
                      </button>
                    )}
                  </div>
                  {lastHintLabel ? (
                    <p className="text-text-muted text-small mt-0.5 truncate text-center">
                      {lastHintLabel}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="min-w-0">
                <div className="relative flex items-center">
                  {!isCompleted && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => handleQuickAdjust(setNum, 'reps', effort === 'time' ? -5 : -1)}
                      className="text-text-muted hover:text-text hover:bg-surface-overlay tap-feedback absolute left-1 z-10 flex h-7 w-5 items-center justify-center rounded transition-transform active:scale-90"
                      aria-label={effort === 'time' ? 'Restar 5 segundos' : 'Restar 1 repetición'}
                      title={effort === 'time' ? '-5s' : '-1 rep'}
                    >
                      <Minus className="h-3 w-3 stroke-[2.5]" />
                    </button>
                  )}
                  <Input
                    id={repsInputId}
                    type="number"
                    inputMode="numeric"
                    enterKeyHint="done"
                    placeholder={priorSet ? String(priorSet.reps) : exercise.reps.toString()}
                    className={cn(
                      'min-h-10 text-center text-sm font-semibold tabular-nums sm:min-h-11 sm:text-base',
                      !isCompleted ? 'px-6' : 'px-2'
                    )}
                    value={logs[key]?.reps || ''}
                    onChange={(e) => onLogChange(setNum, 'reps', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        hapticSuccess();
                        onToggleSetComplete(setNum);
                      }
                    }}
                    disabled={isCompleted}
                    aria-label={
                      effort === 'time'
                        ? `Segundos serie ${setNum}`
                        : `Repeticiones serie ${setNum}`
                    }
                  />
                  {!isCompleted && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => handleQuickAdjust(setNum, 'reps', effort === 'time' ? 5 : 1)}
                      className="text-text-muted hover:text-text hover:bg-surface-overlay tap-feedback absolute right-1 z-10 flex h-7 w-5 items-center justify-center rounded transition-transform active:scale-90"
                      aria-label={effort === 'time' ? 'Sumar 5 segundos' : 'Sumar 1 repetición'}
                      title={effort === 'time' ? '+5s' : '+1 rep'}
                    >
                      <Plus className="h-3 w-3 stroke-[2.5]" />
                    </button>
                  )}
                </div>
                {!showLoad && lastHintLabel ? (
                  <p className="text-text-muted text-small mt-0.5 truncate text-center">
                    {lastHintLabel}
                  </p>
                ) : null}
              </div>
              <div className="flex justify-center">
                {isCompleted ? (
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      onEditSet(setNum);
                    }}
                    className="bg-brand/10 text-brand can-hover:hover:bg-brand/20 tap-feedback flex h-10 w-10 items-center justify-center rounded-xl transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 sm:h-11 sm:w-11"
                    title="Editar serie"
                    aria-label={`Editar serie ${setNum}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      hapticSuccess();
                      onToggleSetComplete(setNum);
                    }}
                    className="border-border/80 bg-surface-raised text-text-muted can-hover:hover:border-brand can-hover:hover:text-brand tap-feedback flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 sm:h-11 sm:w-11"
                    aria-label={`Marcar serie ${setNum} como hecha`}
                  >
                    <CheckCircle className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div className="flex items-stretch gap-2 pt-1">
          <button
            type="button"
            onClick={onAddSet}
            className="can-hover:hover:text-brand can-hover:hover:bg-brand/5 can-hover:hover:border-brand/40 border-border text-text-muted flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed px-2 text-xs font-medium transition-[background-color,border-color,color,box-shadow,opacity] duration-150 [transition-timing-function:var(--ease-out)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Añadir serie
          </button>
          {exercise.sets > 1 && !logs[`${exercise.id}-${exercise.sets}`]?.completed ? (
            <button
              type="button"
              onClick={onRemoveLastSet}
              className="border-border text-text-muted can-hover:hover:border-danger/35 can-hover:hover:text-danger can-hover:hover:bg-red-500/10 inline-flex w-9 shrink-0 items-center justify-center self-stretch rounded-lg border transition-[background-color,border-color,color,box-shadow,opacity] duration-150 [transition-timing-function:var(--ease-out)]"
              aria-label="Eliminar última serie"
              title="Eliminar última serie"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
