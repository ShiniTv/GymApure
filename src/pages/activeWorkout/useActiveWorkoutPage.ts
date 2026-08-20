import { useState, useEffect, useRef } from 'react';
import {
  ApiError,
  apiFetch,
  isNetworkError,
  parseJsonResponse,
  toDisplayErrorMessage,
} from '../../lib/api';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { clientLogger } from '../../lib/clientLogger';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { lastSessionLogMap, resolveSetValues } from './setValues';
import { hapticLight, hapticSuccess } from '../../lib/haptics';
import { useWorkoutPageTitle } from '../../hooks/usePageTitle';
import { useToastOptional } from '../../context/ToastContext';
import { useMemberStatsOptional } from '../../context/MemberStatsContext';
import { buildRoutineExercisePayload } from '../../lib/routineExercisePayload';
import { buildPrescriptionLogSeeds, mergeWorkoutLogSeeds } from '../../lib/setPrescription';
import {
  clearWorkoutLogQueueForSession,
  enqueueWorkoutLog,
  flushWorkoutLogQueue,
  pendingWorkoutLogCount,
  readCachedWorkoutRoutine,
} from '../../lib/workoutOfflineQueue';
import { useExercisesCatalogQuery } from '../../hooks/queries/useExercisesQuery';
import {
  useWorkoutRoutineQuery,
  type WorkoutRoutine,
} from '../../hooks/queries/useWorkoutRoutineQuery';
import {
  useAddRoutineExerciseMutation,
  useDiscardWorkoutMutation,
  useFinishWorkoutMutation,
  useLogWorkoutSetMutation,
  useStartWorkoutMutation,
} from '../../hooks/queries/useWorkoutMutations';
import { useQueryClient } from '@tanstack/react-query';
import { defaultRoutineExerciseForm } from './AddExerciseModal';
import { useRestTimer } from './useRestTimer';
import type { WorkoutLogEntry } from './types';
import type { SkipExerciseReason } from './SkipExerciseModal';

type Routine = WorkoutRoutine;

export function useActiveWorkoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToastOptional();
  const memberStatsCtx = useMemberStatsOptional();
  const queryClient = useQueryClient();
  const startWorkoutMutation = useStartWorkoutMutation();
  const logWorkoutSetMutation = useLogWorkoutSetMutation();
  const finishWorkoutMutation = useFinishWorkoutMutation();
  const discardWorkoutMutation = useDiscardWorkoutMutation();
  const addRoutineExerciseMutation = useAddRoutineExerciseMutation();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [logs, setLogs] = useState<Record<string, WorkoutLogEntry>>({});
  const [lastSessionLogs, setLastSessionLogs] = useState<
    Record<string, { weight: number; reps: number }>
  >({});
  const [completedExercises, setCompletedExercises] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [routineBlockedToday, setRoutineBlockedToday] = useState(false);
  const [setValidationError, setSetValidationError] = useState<string | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [pausePulse, setPausePulse] = useState(false);
  const pausePulseTimeoutRef = useRef<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const { isMobileShell: isMobileFocus } = useBreakpoint();
  const isStartingRef = useRef(false);
  const routineId = id ? Number(id) : null;
  const completedTodayIds = memberStatsCtx?.stats?.completedRoutineIdsToday ?? [];
  const isRoutineCompletedToday = routineId != null && completedTodayIds.includes(routineId);

  const {
    restTimer,
    restDuration,
    isResting,
    notifPermission,
    startRestTimer,
    skipRest,
    addRestTime,
    requestRestNotifications,
  } = useRestTimer(sessionId, id);

  useWorkoutPageTitle(routine?.name);

  const {
    data: routineFromQuery,
    isPending: routinePending,
    isError: routineQueryError,
    isFetched: routineFetched,
  } = useWorkoutRoutineQuery(id);

  useEffect(() => {
    return () => {
      if (pausePulseTimeoutRef.current != null) {
        window.clearTimeout(pausePulseTimeoutRef.current);
      }
    };
  }, []);

  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [newExercise, setNewExercise] = useState(defaultRoutineExerciseForm);
  const [addExerciseError, setAddExerciseError] = useState<string | null>(null);
  const [skipTarget, setSkipTarget] = useState<{ id: number; name: string } | null>(null);
  const [skipReason, setSkipReason] = useState<SkipExerciseReason>('equipment_busy');
  const [skipNote, setSkipNote] = useState('');
  const [skipSaving, setSkipSaving] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const { data: availableExercises = [], isPending: exercisesCatalogLoading } =
    useExercisesCatalogQuery(user?.role !== 'member');

  useEffect(() => {
    if (routineFromQuery) {
      setRoutine(routineFromQuery);
      setFetchError(null);
      setLoading(false);
      return;
    }
    if (routinePending) {
      setLoading(true);
      return;
    }
    if (routineQueryError && routineFetched) {
      const cached = id ? readCachedWorkoutRoutine(id) : null;
      if (cached) {
        setRoutine(cached as Routine);
        setFetchError(null);
        setLoading(false);
        toast?.success('Sin conexión: usando la última rutina guardada.');
        return;
      }
      clientLogger.error('Failed to fetch routine', new Error('workout routine query failed'));
      setRoutine(null);
      setFetchError('No se pudo cargar la rutina. Verifica tu conexión e intenta de nuevo.');
      setLoading(false);
    }
  }, [routineFromQuery, routinePending, routineQueryError, routineFetched, id, toast]);

  useEffect(() => {
    const refreshPending = () => setPendingSyncCount(pendingWorkoutLogCount(sessionId));
    refreshPending();
    const onOnline = () => {
      void flushWorkoutLogQueue(sessionId).then(() => refreshPending());
    };
    window.addEventListener('online', onOnline);
    const interval = window.setInterval(() => {
      if (navigator.onLine) {
        void flushWorkoutLogQueue(sessionId).then(() => refreshPending());
      } else {
        refreshPending();
      }
    }, 15_000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.clearInterval(interval);
    };
  }, [sessionId]);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setTimer((t) => t + 1);
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [isPaused]);

  useEffect(() => {
    if (!routine || loading) return;
    if (isRoutineCompletedToday) {
      setRoutineBlockedToday(true);
      setSessionError('Ya completaste esta rutina hoy. Vuelve mañana.');
    }
  }, [routine, loading, isRoutineCompletedToday]);

  useEffect(() => {
    if (user && routine && !sessionId && !loading && !isResetting && !routineBlockedToday) {
      void startSession(routine.id);
    }
    // startSession closes over latest routine/user; intentional mount-style trigger
  }, [user, routine, sessionId, loading, isResetting, routineBlockedToday]);

  useEffect(() => {
    if (!sessionId) return;
    const timerId = window.setTimeout(() => {
      localStorage.setItem(`active_workout_logs_${sessionId}`, JSON.stringify(logs));
      localStorage.setItem(
        `active_workout_completed_exercises_${sessionId}`,
        JSON.stringify(completedExercises)
      );
    }, 500);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [logs, completedExercises, sessionId]);

  const toggleExerciseComplete = (exerciseId: number) => {
    const isNowComplete = !completedExercises[exerciseId];
    setCompletedExercises((prev) => ({
      ...prev,
      [exerciseId]: isNowComplete,
    }));

    if (isNowComplete) {
      const exercise = routine?.exercises.find((e) => e.id === exerciseId);
      if (exercise) {
        setLogs((prev) => {
          const newLogs = { ...prev };
          for (let i = 1; i <= exercise.sets; i++) {
            const key = `${exerciseId}-${i}`;
            if (!newLogs[key]?.completed) {
              newLogs[key] = {
                ...newLogs[key],
                exercise_id: exerciseId,
                set_number: i,
                weight: newLogs[key]?.weight || '0',
                reps: newLogs[key]?.reps || exercise.reps.toString(),
                completed: true,
              };
            }
          }
          return newLogs;
        });
      }
      if (isMobileFocus && routine) {
        const idx = routine.exercises.findIndex((e) => e.id === exerciseId);
        if (idx >= 0 && idx < routine.exercises.length - 1) {
          window.setTimeout(() => {
            setFocusedIndex(idx + 1);
          }, 300);
        }
      }
    }
  };

  const reloadRoutine = () => {
    if (!id) return;
    void queryClient.invalidateQueries({ queryKey: ['workout-routine', id] });
  };

  const handleAddExercise = async () => {
    if (!newExercise.exercise_id || !id) return;
    setAddExerciseError(null);

    try {
      await addRoutineExerciseMutation.mutateAsync({
        routineId: id,
        payload: buildRoutineExercisePayload(newExercise),
      });
      setIsAddingExercise(false);
      reloadRoutine();
      setNewExercise(defaultRoutineExerciseForm());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo añadir el ejercicio';
      setAddExerciseError(message);
      clientLogger.error('Failed to add exercise to routine', err);
    }
  };

  const handleAddSet = (exerciseId: number) => {
    const exercise = routine?.exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;
    const nextSetNum = exercise.sets + 1;
    const nextRow = exercise.set_prescription?.find((row) => row.set_number === nextSetNum);
    const prescribedReps = nextRow?.reps ?? exercise.reps;
    const prevLog = logs[`${exerciseId}-${exercise.sets}`];
    const prescribedWeight =
      nextRow?.load === 'plates' || (nextRow?.plates != null && nextRow.plates > 0)
        ? nextRow?.plates
        : nextRow?.weight_kg;

    setRoutine((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: prev.exercises.map((e) =>
          e.id === exerciseId ? { ...e, sets: e.sets + 1 } : e
        ),
      };
    });

    const key = `${exerciseId}-${nextSetNum}`;
    setLogs((prev) => ({
      ...prev,
      [key]: {
        exercise_id: exerciseId,
        set_number: nextSetNum,
        weight: prescribedWeight != null ? String(prescribedWeight) : (prevLog?.weight ?? '0'),
        reps: String(prescribedReps),
        completed: false,
      },
    }));
  };

  const handleRemoveLastSet = (exerciseId: number) => {
    const exercise = routine?.exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;
    if (exercise.sets <= 1) return;

    const lastSetNum = exercise.sets;
    const lastKey = `${exerciseId}-${lastSetNum}`;
    const isLastCompleted = Boolean(logs[lastKey]?.completed);
    if (isLastCompleted) {
      toast?.error('No puedes eliminar una serie completada.');
      return;
    }

    setRoutine((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: prev.exercises.map((e) =>
          e.id === exerciseId ? { ...e, sets: Math.max(1, e.sets - 1) } : e
        ),
      };
    });

    setLogs((prev) => {
      const { [lastKey]: _removed, ...rest } = prev;
      return rest;
    });

    setCompletedExercises((prev) => ({ ...prev, [exerciseId]: false }));
  };

  const startSession = async (startRoutineId: number) => {
    if (!user || !routine || isStartingRef.current || routineBlockedToday) return;
    isStartingRef.current = true;
    try {
      const data = await startWorkoutMutation.mutateAsync({
        userId: user.id,
        routineId: startRoutineId,
      });
      setSessionId(data.id);
      setLastSessionLogs(lastSessionLogMap(data.last_session_logs ?? []));

      const savedCompletedStr = localStorage.getItem(
        `active_workout_completed_exercises_${data.id}`
      );
      if (savedCompletedStr) {
        try {
          setCompletedExercises(JSON.parse(savedCompletedStr));
        } catch (e) {
          clientLogger.error('Failed to parse saved completed exercises', e);
        }
      }

      if (data.start_time) {
        const startTimeStr = data.start_time.endsWith('Z')
          ? data.start_time
          : `${data.start_time}Z`;
        const startTime = new Date(startTimeStr).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setTimer(elapsed > 0 ? elapsed : 0);
      }

      const seeded = buildPrescriptionLogSeeds(routine.exercises);
      const apiLogs = Array.isArray(data.logs) ? data.logs : [];
      const merged = mergeWorkoutLogSeeds(seeded, apiLogs);
      setLogs(merged);

      if (apiLogs.length > 0) {
        const maxSetsPerExercise: Record<number, number> = {};
        apiLogs.forEach((log) => {
          if (
            !maxSetsPerExercise[log.exercise_id] ||
            log.set_number > maxSetsPerExercise[log.exercise_id]
          ) {
            maxSetsPerExercise[log.exercise_id] = log.set_number;
          }
        });
        setRoutine((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            exercises: prev.exercises.map((e) => {
              const maxSet = maxSetsPerExercise[e.id] || 0;
              return maxSet > e.sets ? { ...e, sets: maxSet } : e;
            }),
          };
        });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setRoutineBlockedToday(true);
        setSessionError('Ya completaste esta rutina hoy. Vuelve mañana.');
        return;
      }
      clientLogger.error('Failed to start workout session', err);
      setSessionError('No se pudo iniciar la sesión. Recarga la página para reintentar.');
    } finally {
      isStartingRef.current = false;
    }
  };

  const handleLogChange = (
    exerciseId: number,
    setNum: number,
    field: 'weight' | 'reps',
    value: string
  ) => {
    const key = `${exerciseId}-${setNum}`;
    setLogs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        exercise_id: exerciseId,
        set_number: setNum,
        [field]: value,
        completed: prev[key]?.completed || false,
      },
    }));
  };

  const editSet = (exerciseId: number, setNum: number) => {
    const key = `${exerciseId}-${setNum}`;
    setLogs((prev) => ({
      ...prev,
      [key]: { ...prev[key], completed: false },
    }));
    setCompletedExercises((prev) => ({
      ...prev,
      [exerciseId]: false,
    }));
  };

  const toggleSetComplete = async (exerciseId: number, setNum: number) => {
    const key = `${exerciseId}-${setNum}`;
    const exercise = routine?.exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;

    const { weight, reps } = resolveSetValues(exercise, setNum, logs, lastSessionLogs);

    if (!Number.isFinite(weight) || weight < 0 || !Number.isFinite(reps) || reps < 1) {
      setSetValidationError('Ingresa peso y repeticiones antes de marcar la serie.');
      return;
    }
    setSetValidationError(null);

    setLogs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        exercise_id: exerciseId,
        set_number: setNum,
        weight: String(weight),
        reps: String(reps),
        completed: true,
      },
    }));

    try {
      await logWorkoutSetMutation.mutateAsync({
        session_id: sessionId,
        exercise_id: exerciseId,
        set_number: setNum,
        weight,
        reps,
      });

      hapticLight();

      if (exercise.rest_seconds > 0) {
        startRestTimer(exercise.rest_seconds);
      }

      const allSetsDone = Array.from({ length: exercise.sets }).every((_, i) => {
        const setKey = `${exerciseId}-${i + 1}`;
        if (i + 1 === setNum) return true;
        return logs[setKey]?.completed;
      });
      if (allSetsDone) {
        setCompletedExercises((prev) => ({ ...prev, [exerciseId]: true }));
        if (routine) {
          const idx = routine.exercises.findIndex((e) => e.id === exerciseId);
          if (idx >= 0 && idx < routine.exercises.length - 1) {
            const nextExerciseId = routine.exercises[idx + 1]?.id;
            window.setTimeout(() => {
              if (isMobileFocus) {
                setFocusedIndex(idx + 1);
              } else if (nextExerciseId != null) {
                document
                  .getElementById(`active-workout-exercise-${nextExerciseId}`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 350);
          }
        }
      }
    } catch (err) {
      if (isNetworkError(err) && sessionId) {
        enqueueWorkoutLog({
          session_id: sessionId,
          exercise_id: exerciseId,
          set_number: setNum,
          weight,
          reps,
        });
        setPendingSyncCount(pendingWorkoutLogCount(sessionId));
        toast?.success('Serie guardada offline. Se sincronizará al recuperar conexión.');
        hapticLight();
        if (exercise.rest_seconds > 0) {
          startRestTimer(exercise.rest_seconds);
        }
        return;
      }
      clientLogger.error('Failed to log workout set', err);
      setLogs((prev) => ({
        ...prev,
        [key]: { ...prev[key], completed: false },
      }));
      toast?.error(toDisplayErrorMessage(err, 'No se pudo registrar la serie'));
    }
  };

  const [isFinishing, setIsFinishing] = useState(false);
  const [isSubmittingFinish, setIsSubmittingFinish] = useState(false);

  const confirmFinish = async (success: boolean) => {
    if (!sessionId) {
      setFinishError('Sesión no iniciada. Recarga la página e intenta de nuevo.');
      return;
    }
    if (isSubmittingFinish) return;

    setFinishError(null);
    setIsSubmittingFinish(true);
    try {
      if (pendingWorkoutLogCount(sessionId) > 0) {
        await flushWorkoutLogQueue(sessionId);
        setPendingSyncCount(pendingWorkoutLogCount(sessionId));
        if (pendingWorkoutLogCount(sessionId) > 0) {
          setFinishError(
            'Hay series pendientes de sincronizar. Conéctate a internet e intenta de nuevo.'
          );
          return;
        }
      }
      await finishWorkoutMutation.mutateAsync({
        sessionId,
        success,
        routineId: routineId ?? undefined,
      });
      clearWorkoutLogQueueForSession(sessionId);
      localStorage.removeItem(`active_workout_logs_${sessionId}`);
      localStorage.removeItem(`active_workout_sets_${sessionId}`);
      localStorage.removeItem(`active_workout_completed_exercises_${sessionId}`);
      if (success) {
        setRoutineBlockedToday(true);
      }
      await memberStatsCtx?.refresh();
      setIsFinishing(false);
      if (success) {
        hapticSuccess();
        setShowCelebration(true);
        window.setTimeout(() => {
          void navigate('/history');
        }, 2200);
      } else {
        void navigate('/routines');
      }
    } catch (err) {
      clientLogger.error('Failed to finish workout', err);
      setFinishError(err instanceof Error ? err.message : 'Error al finalizar el entrenamiento.');
    } finally {
      setIsSubmittingFinish(false);
    }
  };

  const finishWorkout = () => {
    if (!sessionId) {
      setFinishError('Sesión no iniciada. Recarga la página e intenta de nuevo.');
      return;
    }
    setFinishError(null);
    setIsFinishing(true);
  };

  const resetProgress = () => {
    setShowResetConfirm(true);
  };

  const togglePause = () => {
    const next = !isPaused;
    setIsPaused(next);
    hapticLight();
    setPausePulse(true);
    if (pausePulseTimeoutRef.current != null) {
      window.clearTimeout(pausePulseTimeoutRef.current);
    }
    pausePulseTimeoutRef.current = window.setTimeout(() => setPausePulse(false), 520);
  };

  const confirmResetProgress = async () => {
    setIsResetting(true);
    setSessionError(null);
    try {
      if (sessionId) {
        await discardWorkoutMutation.mutateAsync({
          sessionId,
          routineId: routineId ?? undefined,
        });
        clearWorkoutLogQueueForSession(sessionId);
        localStorage.removeItem(`active_workout_logs_${sessionId}`);
        localStorage.removeItem(`active_workout_sets_${sessionId}`);
        localStorage.removeItem(`active_workout_completed_exercises_${sessionId}`);
      }
      setShowResetConfirm(false);
      setSessionId(null);
      setTimer(0);
      setIsPaused(false);
      setLogs({});
      setCompletedExercises({});
      setFinishError(null);
    } catch (err) {
      clientLogger.error('Failed to cancel workout session', err);
      setSessionError(err instanceof Error ? err.message : 'No se pudo reiniciar la sesión.');
      setShowResetConfirm(false);
    } finally {
      setIsResetting(false);
    }
  };

  const completedCount = routine
    ? routine.exercises.filter((e) => completedExercises[e.id]).length
    : 0;
  const progressPct =
    routine && routine.exercises.length
      ? Math.round((completedCount / routine.exercises.length) * 100)
      : 0;
  const completedSets = Object.values(logs).filter((entry) => entry.completed).length;
  const totalVolumeKg = Object.values(logs).reduce((sum, entry) => {
    if (!entry.completed) return sum;
    const weight = Number.parseFloat(entry.weight ?? '0');
    const reps = Number.parseInt(entry.reps ?? '0', 10);
    if (!Number.isFinite(weight) || weight < 0 || !Number.isFinite(reps) || reps < 1) return sum;
    return sum + weight * reps;
  }, 0);

  const openSkipExercise = (exercise: { id: number; name: string }) => {
    setSkipTarget(exercise);
    setSkipReason('equipment_busy');
    setSkipNote('');
    setSkipError(null);
  };

  const confirmSkipExercise = async () => {
    if (!skipTarget || !sessionId) return;
    setSkipSaving(true);
    setSkipError(null);
    try {
      const res = await apiFetch(`/api/workouts/sessions/${sessionId}/skip-exercise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_id: skipTarget.id,
          reason: skipReason,
          note: skipNote.trim() || undefined,
        }),
      });
      await parseJsonResponse(res);
      setCompletedExercises((prev) => ({ ...prev, [skipTarget.id]: true }));
      hapticSuccess();
      setSkipTarget(null);
      toast?.success('Ejercicio saltado');
      void memberStatsCtx?.refresh();
    } catch (err) {
      setSkipError(err instanceof Error ? err.message : 'No se pudo saltar el ejercicio');
    } finally {
      setSkipSaving(false);
    }
  };

  const isMember = user?.role === 'member';

  return {
    navigate,
    user,
    isMember,
    routine,
    loading,
    fetchError,
    routineBlockedToday,
    sessionError,
    setValidationError,
    pendingSyncCount,
    showCelebration,
    isMobileFocus,
    timer,
    isPaused,
    pausePulse,
    sessionId,
    isResetting,
    completedCount,
    progressPct,
    completedSets,
    totalVolumeKg,
    isAddingExercise,
    setIsAddingExercise,
    availableExercises,
    exercisesCatalogLoading,
    newExercise,
    setNewExercise,
    addExerciseError,
    setAddExerciseError,
    isResting,
    focusedIndex,
    setFocusedIndex,
    completedExercises,
    logs,
    lastSessionLogs,
    isFinishing,
    setIsFinishing,
    finishError,
    setFinishError,
    isSubmittingFinish,
    showResetConfirm,
    setShowResetConfirm,
    restTimer,
    restDuration,
    notifPermission,
    skipRest,
    addRestTime,
    requestRestNotifications,
    togglePause,
    resetProgress,
    finishWorkout,
    handleAddExercise,
    toggleExerciseComplete,
    handleLogChange,
    editSet,
    toggleSetComplete,
    handleAddSet,
    handleRemoveLastSet,
    confirmFinish,
    confirmResetProgress,
    skipTarget,
    setSkipTarget,
    skipReason,
    setSkipReason,
    skipNote,
    setSkipNote,
    skipSaving,
    skipError,
    openSkipExercise,
    confirmSkipExercise,
  };
}
