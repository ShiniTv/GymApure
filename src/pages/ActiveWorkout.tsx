import { CheckCircle, Dumbbell } from 'lucide-react';
import { Button, EmptyState, Breadcrumbs, WorkoutShellSkeleton } from '../components/ui';
import { hasNotificationPermission } from '../lib/restTimerNotifications';
import { WorkoutCelebration } from '../components/workout/WorkoutCelebration';
import { RestTimerOverlay } from './activeWorkout/RestTimerOverlay';
import { WorkoutHeader } from './activeWorkout/WorkoutHeader';
import { AddExerciseModal } from './activeWorkout/AddExerciseModal';
import { ExerciseFocusNav } from './activeWorkout/ExerciseFocusNav';
import { FinishWorkoutModal, ResetWorkoutModal } from './activeWorkout/WorkoutSessionModals';
import { ActiveWorkoutExerciseList } from './activeWorkout/ActiveWorkoutExerciseList';
import { useActiveWorkoutPage } from './activeWorkout/useActiveWorkoutPage';

export default function ActiveWorkout() {
  const page = useActiveWorkoutPage();

  if (page.loading) {
    return <WorkoutShellSkeleton />;
  }

  if (page.fetchError || !page.routine) {
    return (
      <div className="page-stack-tight mx-auto w-full max-w-5xl">
        <EmptyState
          icon={Dumbbell}
          title="Rutina no disponible"
          description={page.fetchError ?? 'No se encontró la rutina solicitada.'}
          action={<Button onClick={() => page.navigate('/routines')}>Volver a rutinas</Button>}
        />
      </div>
    );
  }

  if (page.routineBlockedToday) {
    return (
      <div className="page-stack-tight mx-auto w-full max-w-5xl">
        <EmptyState
          icon={CheckCircle}
          title="Rutina completada hoy"
          description={
            page.sessionError ??
            'Ya entrenaste esta rutina hoy. Puedes volver mañana o revisar tu historial.'
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="secondary" onClick={() => page.navigate('/history')}>
                Ver historial
              </Button>
              <Button onClick={() => page.navigate('/routines')}>Volver a rutinas</Button>
            </div>
          }
        />
      </div>
    );
  }

  const { routine } = page;

  return (
    <div
      className={`page-stack-tight mx-auto w-full max-w-5xl ${page.isMobileFocus ? 'pb-36' : 'pb-20'}`}
    >
      <WorkoutCelebration active={page.showCelebration} />
      <Breadcrumbs
        className="hidden md:flex"
        items={[{ label: 'Rutinas', href: '/routines' }, { label: routine.name }]}
      />

      <WorkoutHeader
        routineName={routine.name}
        timer={page.timer}
        isPaused={page.isPaused}
        pausePulse={page.pausePulse}
        completedCount={page.completedCount}
        totalExercises={routine.exercises.length}
        progressPct={page.progressPct}
        sessionId={page.sessionId}
        isResetting={page.isResetting}
        onBack={() => page.navigate('/routines')}
        onTogglePause={page.togglePause}
        onReset={page.resetProgress}
        onFinish={page.finishWorkout}
      />

      {page.pendingSyncCount > 0 && (
        <div
          className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-800 dark:text-amber-200"
          role="status"
        >
          {page.pendingSyncCount} serie{page.pendingSyncCount === 1 ? '' : 's'} pendiente
          {page.pendingSyncCount === 1 ? '' : 's'} de sincronizar. Se enviarán al recuperar
          conexión.
        </div>
      )}

      {page.sessionError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400">
          {page.sessionError}
        </div>
      )}

      {page.setValidationError && (
        <div className="border-brand/30 bg-brand/10 text-brand dark:text-brand rounded-2xl border px-4 py-3 text-sm font-bold">
          {page.setValidationError}
        </div>
      )}

      <AddExerciseModal
        open={page.isAddingExercise}
        exercises={page.availableExercises}
        value={page.newExercise}
        error={page.addExerciseError}
        onClose={() => {
          page.setIsAddingExercise(false);
          page.setAddExerciseError(null);
        }}
        onChange={page.setNewExercise}
        onSubmit={() => void page.handleAddExercise()}
      />

      {page.isMobileFocus && !page.isResting ? (
        <ExerciseFocusNav
          exercises={routine.exercises}
          focusedIndex={page.focusedIndex}
          completedExercises={page.completedExercises}
          onFocus={page.setFocusedIndex}
        />
      ) : null}

      <ActiveWorkoutExerciseList
        exercises={routine.exercises}
        isMobileFocus={page.isMobileFocus}
        focusedIndex={page.focusedIndex}
        completedExercises={page.completedExercises}
        logs={page.logs}
        lastSessionLogs={page.lastSessionLogs}
        onToggleComplete={page.toggleExerciseComplete}
        onLogChange={page.handleLogChange}
        onEditSet={page.editSet}
        onToggleSetComplete={(exerciseId, setNum) =>
          void page.toggleSetComplete(exerciseId, setNum)
        }
        onAddSet={page.handleAddSet}
        onRemoveLastSet={page.handleRemoveLastSet}
      />

      <FinishWorkoutModal
        open={page.isFinishing}
        timer={page.timer}
        completedCount={page.completedCount}
        totalExercises={routine.exercises.length}
        completedSets={page.completedSets}
        totalVolumeKg={page.totalVolumeKg}
        finishError={page.finishError}
        isSubmitting={page.isSubmittingFinish}
        onClose={() => {
          page.setIsFinishing(false);
          page.setFinishError(null);
        }}
        onConfirm={(success) => void page.confirmFinish(success)}
      />

      <ResetWorkoutModal
        open={page.showResetConfirm}
        isResetting={page.isResetting}
        onClose={() => page.setShowResetConfirm(false)}
        onConfirm={() => void page.confirmResetProgress()}
      />

      {page.isResting && (
        <RestTimerOverlay
          restTimer={page.restTimer}
          restDuration={page.restDuration}
          onAddTime={page.addRestTime}
          onSkip={page.skipRest}
          notificationsEnabled={hasNotificationPermission() || page.notifPermission === 'granted'}
          canRequestNotifications={
            typeof Notification !== 'undefined' && page.notifPermission === 'default'
          }
          onRequestNotifications={() => void page.requestRestNotifications()}
        />
      )}
    </div>
  );
}
