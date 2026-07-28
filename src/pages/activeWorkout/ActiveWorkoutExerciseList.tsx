import { WorkoutExerciseCard } from './WorkoutExerciseCard';
import type { WorkoutLogEntry } from './types';
import type { WorkoutRoutine } from '../../hooks/queries/useWorkoutRoutineQuery';

type Exercise = WorkoutRoutine['exercises'][number];

export function ActiveWorkoutExerciseList({
  exercises,
  isMobileFocus,
  focusedIndex,
  completedExercises,
  logs,
  lastSessionLogs,
  onToggleComplete,
  onLogChange,
  onEditSet,
  onToggleSetComplete,
  onAddSet,
  onRemoveLastSet,
}: {
  exercises: Exercise[];
  isMobileFocus: boolean;
  focusedIndex: number;
  completedExercises: Record<number, boolean>;
  logs: Record<string, WorkoutLogEntry>;
  lastSessionLogs: Record<string, { weight: number; reps: number }>;
  onToggleComplete: (exerciseId: number) => void;
  onLogChange: (
    exerciseId: number,
    setNum: number,
    field: 'weight' | 'reps',
    value: string
  ) => void;
  onEditSet: (exerciseId: number, setNum: number) => void;
  onToggleSetComplete: (exerciseId: number, setNum: number) => void;
  onAddSet: (exerciseId: number) => void;
  onRemoveLastSet: (exerciseId: number) => void;
}) {
  return (
    <div className="page-stack-tight">
      {exercises.map((exercise, index) => (
        <WorkoutExerciseCard
          key={exercise.id}
          exercise={exercise}
          index={index}
          hidden={isMobileFocus && index !== focusedIndex}
          completed={Boolean(completedExercises[exercise.id])}
          logs={logs}
          lastSessionLogs={lastSessionLogs}
          onToggleComplete={() => onToggleComplete(exercise.id)}
          onLogChange={(setNum, field, value) => onLogChange(exercise.id, setNum, field, value)}
          onEditSet={(setNum) => onEditSet(exercise.id, setNum)}
          onToggleSetComplete={(setNum) => onToggleSetComplete(exercise.id, setNum)}
          onAddSet={() => onAddSet(exercise.id)}
          onRemoveLastSet={() => onRemoveLastSet(exercise.id)}
        />
      ))}
    </div>
  );
}
