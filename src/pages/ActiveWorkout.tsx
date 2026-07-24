import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { apiFetch, parseJsonResponse, ApiError, isNetworkError } from '../lib/api';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Video,
  Plus,
  BookOpen,
  Edit2,
  Dumbbell,
  ChevronLeft,
  ChevronRight,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import {
  Button,
  Modal,
  Label,
  Input,
  EmptyState,
  Breadcrumbs,
  WorkoutShellSkeleton,
  Spinner,
  AnchoredMenu,
  Collapse,
} from '../components/ui';
import { clientLogger } from '../lib/clientLogger';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { cn } from '../lib/utils';
import { formatMuscleGroupLabel } from '../lib/exerciseMuscleGroups';
import { RestTimerOverlay } from './activeWorkout/RestTimerOverlay';
import { formatWorkoutTime } from './activeWorkout/utils';
import {
  formatLastSetHint,
  getLastSetHint,
  lastSessionLogMap,
  resolveSetValues,
  type LastSessionSetLog,
} from './activeWorkout/setValues';
import {
  ExerciseExecutionSteps,
  executionStepCount,
} from '../components/exercise/ExerciseExecutionSteps';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import {
  clearRestNotification,
  hasNotificationPermission,
  listenRestNotificationActions,
  notifyRestEnded,
  startRestNotification,
} from '../lib/restTimerNotifications';
import { WorkoutCelebration } from '../components/workout/WorkoutCelebration';
import { useWorkoutPageTitle } from '../hooks/usePageTitle';
import { useToastOptional } from '../context/ToastContext';
import { useMemberStatsOptional } from '../context/MemberStatsContext';
import { toDisplayErrorMessage } from '../lib/api';
import { parseNonNegativeInt, parsePositiveInt } from '../lib/parseFormNumber';
import {
  buildRoutineExercisePayload,
  defaultRoutineExerciseForm,
} from '../lib/routineExercisePayload';
import {
  deriveSetPrescription,
  parseSetPrescriptionFromApi,
  buildPrescriptionLogSeeds,
  mergeWorkoutLogSeeds,
} from '../lib/setPrescription';
import {
  cacheWorkoutRoutine,
  clearWorkoutLogQueueForSession,
  enqueueWorkoutLog,
  flushWorkoutLogQueue,
  pendingWorkoutLogCount,
  readCachedWorkoutRoutine,
} from '../lib/workoutOfflineQueue';

const ExercisePicker = lazy(() =>
  import('../components/exercise/ExercisePicker').then((m) => ({ default: m.ExercisePicker }))
);
const ExerciseVideoPlayer = lazy(() =>
  import('../components/exercise/ExerciseVideoPlayer').then((m) => ({
    default: m.ExerciseVideoPlayer,
  }))
);

interface Exercise {
  id: number;
  name: string;
  muscle_group: string;
  description?: string;
  execution?: string;
  video_url: string;
  video_poster_url?: string | null;
  sets: number;
  reps: number;
  rest_seconds: number;
  weight_suggestion: string;
  set_prescription?: import('../lib/setPrescription').SetPrescriptionRow[] | null;
}

interface Routine {
  id: number;
  name: string;
  difficulty: string;
  exercises: Exercise[];
}

interface LogEntry {
  exercise_id: number;
  set_number: number;
  weight: string;
  reps: string;
  completed: boolean;
}

interface ExerciseOption {
  id: number;
  name: string;
  muscle_group: string;
}

interface SessionLogResponse {
  exercise_id: number;
  set_number: number;
  weight: number;
  reps: number;
}

function restStorageKey(sessionId: number): string {
  return `workout_rest_${sessionId}`;
}

function clearRestSessionStorage(sessionId: number | null): void {
  if (sessionId == null) return;
  try {
    sessionStorage.removeItem(restStorageKey(sessionId));
  } catch {
    /* ignore */
  }
}

function workoutRestUrl(routineId: string | undefined): string {
  return routineId ? `/workout/${routineId}` : '/';
}

const workoutIconBtn =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-overlay disabled:opacity-40';

const workoutChipBtn =
  'tap-feedback flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-2 py-1 text-xs font-medium text-text-secondary transition-[color,transform,opacity] duration-150 hover:text-text';

export default function ActiveWorkout() {
  const { id } = useParams(); // Routine ID
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToastOptional();
  const memberStatsCtx = useMemberStatsOptional();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [logs, setLogs] = useState<Record<string, LogEntry>>({});
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
  const [showExecution, setShowExecution] = useState<Record<number, boolean>>({});
  const [timer, setTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMenuOpen, setResetMenuOpen] = useState(false);
  const resetMenuAnchorRef = useRef<HTMLButtonElement>(null);
  const [pausePulse, setPausePulse] = useState(false);
  const pausePulseTimeoutRef = useRef<number | null>(null);

  // Rest Timer State (wall-clock endsAt so background tabs stay accurate)
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restDuration, setRestDuration] = useState(0);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const restEndedNotifiedRef = useRef(false);
  const addRestTimeRef = useRef<(seconds: number) => void>(() => undefined);
  const skipRestRef = useRef<() => void>(() => undefined);
  const [showVideo, setShowVideo] = useState<Record<number, boolean>>({});
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const { isMobileShell: isMobileFocus } = useBreakpoint();
  const isStartingRef = useRef(false);
  const routineId = id ? Number(id) : null;
  const completedTodayIds = memberStatsCtx?.stats?.completedRoutineIdsToday ?? [];
  const isRoutineCompletedToday = routineId != null && completedTodayIds.includes(routineId);

  useWorkoutPageTitle(routine?.name);

  useEffect(() => {
    return () => {
      if (pausePulseTimeoutRef.current != null) {
        window.clearTimeout(pausePulseTimeoutRef.current);
      }
    };
  }, []);

  // Add Exercise State
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>([]);
  const [newExercise, setNewExercise] = useState(defaultRoutineExerciseForm);
  const [addExerciseError, setAddExerciseError] = useState<string | null>(null);

  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    const cached = readCachedWorkoutRoutine(id);
    if (cached) {
      setRoutine(cached as Routine);
      setFetchError(null);
      setLoading(false);
    }
    apiFetch(`/api/routines/${id}`)
      .then((res) => parseJsonResponse<Routine>(res))
      .then((data) => {
        const exercises = (data.exercises ?? []).map((exercise) => ({
          ...exercise,
          set_prescription:
            parseSetPrescriptionFromApi(exercise.set_prescription) ??
            deriveSetPrescription(exercise.sets, exercise.reps),
        }));
        const normalized = { ...data, exercises };
        setRoutine(normalized);
        cacheWorkoutRoutine(id, normalized);
        setFetchError(null);
        setLoading(false);
      })
      .catch((err) => {
        clientLogger.error('Failed to fetch routine', err);
        if (cached) {
          toast?.success('Sin conexión: usando la última rutina guardada.');
          return;
        }
        setRoutine(null);
        setFetchError('No se pudo cargar la rutina. Verifica tu conexión e intenta de nuevo.');
        setLoading(false);
      });
  }, [id, toast]);

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
    if (!isAddingExercise) return;
    apiFetch('/api/exercises?all=1')
      .then((res) => parseJsonResponse<ExerciseOption[]>(res))
      .then((data) => {
        setAvailableExercises(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        clientLogger.error('Failed to fetch exercises catalog', err);
      });
  }, [isAddingExercise]);

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
  }, [user, routine, sessionId, loading, isResetting, routineBlockedToday]);

  // Rest timer — wall-clock based (survives background throttling)
  useEffect(() => {
    if (!isResting || restEndsAt == null) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000));
      setRestTimer(remaining);
      if (remaining <= 0) {
        setIsResting(false);
        setRestEndsAt(null);
        if (!restEndedNotifiedRef.current) {
          restEndedNotifiedRef.current = true;
          hapticSuccess();
          notifyRestEnded(workoutRestUrl(id));
        }
        clearRestSessionStorage(sessionId);
      }
    };

    tick();
    const interval = window.setInterval(tick, 250);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', tick);
    };
  }, [isResting, restEndsAt, sessionId, id]);

  // Persist rest endsAt for short reloads
  useEffect(() => {
    if (!sessionId || !isResting || restEndsAt == null) return;
    try {
      sessionStorage.setItem(
        restStorageKey(sessionId),
        JSON.stringify({ endsAt: restEndsAt, duration: restDuration })
      );
    } catch {
      /* ignore */
    }
  }, [sessionId, isResting, restEndsAt, restDuration]);

  // Restore rest after reload
  useEffect(() => {
    if (!sessionId || isResting) return;
    try {
      const raw = sessionStorage.getItem(restStorageKey(sessionId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as { endsAt?: number; duration?: number };
      if (typeof parsed.endsAt !== 'number') return;
      const remaining = Math.max(0, Math.ceil((parsed.endsAt - Date.now()) / 1000));
      if (remaining <= 0) {
        clearRestSessionStorage(sessionId);
        return;
      }
      restEndedNotifiedRef.current = false;
      setRestEndsAt(parsed.endsAt);
      setRestDuration(typeof parsed.duration === 'number' ? parsed.duration : remaining);
      setRestTimer(remaining);
      setIsResting(true);
      startRestNotification(parsed.endsAt, workoutRestUrl(id));
    } catch {
      /* ignore */
    }
  }, [sessionId, isResting, id]);

  // Screen Wake Lock while resting and visible
  useEffect(() => {
    if (!isResting) {
      void wakeLockRef.current?.release().catch(() => undefined);
      wakeLockRef.current = null;
      return;
    }

    const requestLock = async () => {
      if (document.visibilityState !== 'visible') return;
      if (!('wakeLock' in navigator)) return;
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch {
        /* unsupported / denied */
      }
    };

    void requestLock();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void requestLock();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      void wakeLockRef.current?.release().catch(() => undefined);
      wakeLockRef.current = null;
    };
  }, [isResting]);

  // Notification action handlers (+30s / Saltar from lock screen)
  useEffect(() => {
    return listenRestNotificationActions({
      onAdd30: () => addRestTimeRef.current(30),
      onSkip: () => skipRestRef.current(),
    });
  }, []);

  // Clear rest notification when leaving the workout page
  useEffect(() => {
    return () => {
      clearRestNotification();
    };
  }, []);

  // Persist progress — debounced to avoid blocking the main thread on every keystroke
  useEffect(() => {
    if (!sessionId) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(`active_workout_logs_${sessionId}`, JSON.stringify(logs));
      localStorage.setItem(
        `active_workout_completed_exercises_${sessionId}`,
        JSON.stringify(completedExercises)
      );
    }, 500);
    return () => {
      window.clearTimeout(timer);
    };
  }, [logs, completedExercises, sessionId]);

  const toggleExerciseComplete = (exerciseId: number) => {
    const isNowComplete = !completedExercises[exerciseId];
    setCompletedExercises((prev) => ({
      ...prev,
      [exerciseId]: isNowComplete,
    }));

    if (isNowComplete) {
      // Mark all sets as completed in the logs state for UI consistency
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

  const startRestTimer = (seconds: number) => {
    if (seconds <= 0) return;
    const endsAt = Date.now() + seconds * 1000;
    restEndedNotifiedRef.current = false;
    setRestDuration(seconds);
    setRestEndsAt(endsAt);
    setRestTimer(seconds);
    setIsResting(true);
    startRestNotification(endsAt, workoutRestUrl(id));
    if (typeof Notification !== 'undefined') {
      setNotifPermission(Notification.permission);
    }
  };

  const skipRest = () => {
    setIsResting(false);
    setRestTimer(0);
    setRestEndsAt(null);
    clearRestNotification();
    clearRestSessionStorage(sessionId);
  };

  const addRestTime = (seconds: number) => {
    setRestEndsAt((prev) => {
      const base = prev != null && prev > Date.now() ? prev : Date.now();
      const next = base + seconds * 1000;
      const remaining = Math.max(0, Math.ceil((next - Date.now()) / 1000));
      setRestTimer(remaining);
      setRestDuration((d) => d + seconds);
      restEndedNotifiedRef.current = false;
      startRestNotification(next, workoutRestUrl(id));
      return next;
    });
    setIsResting(true);
  };
  addRestTimeRef.current = addRestTime;
  skipRestRef.current = skipRest;

  const requestRestNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted' && restEndsAt != null) {
        startRestNotification(restEndsAt, workoutRestUrl(id));
      }
    } catch {
      /* ignore */
    }
  };

  const toggleVideo = (id: number) => {
    setShowVideo((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const reloadRoutine = () => {
    if (!id) return;
    apiFetch(`/api/routines/${id}`)
      .then((res) => parseJsonResponse<Routine>(res))
      .then((data) => {
        setRoutine(data);
      })
      .catch((err) => {
        clientLogger.error('Failed to reload routine', err);
      });
  };

  const handleAddExercise = async () => {
    if (!newExercise.exercise_id) return;
    setAddExerciseError(null);

    try {
      const res = await apiFetch(`/api/routines/${id}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRoutineExercisePayload(newExercise)),
      });

      await parseJsonResponse(res);
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
    const prescribedReps =
      exercise.set_prescription?.find((row) => row.set_number === nextSetNum)?.reps ??
      exercise.reps;
    const prescribedWeight = exercise.set_prescription?.find(
      (row) => row.set_number === nextSetNum
    )?.weight_kg;

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
        weight: prescribedWeight != null ? String(prescribedWeight) : '0',
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
      // Avoid `delete next[lastKey]` (dinamic key) to keep ESLint happy.
      // Build the next object without the last set key.
      const { [lastKey]: _removed, ...rest } = prev;
      return rest;
    });

    // If user deleted a set, the exercise can't remain marked as fully complete.
    setCompletedExercises((prev) => ({ ...prev, [exerciseId]: false }));
  };

  const startSession = async (routineId: number) => {
    if (!user || !routine || isStartingRef.current || routineBlockedToday) return;
    isStartingRef.current = true;
    try {
      const res = await apiFetch('/api/workouts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, routine_id: routineId }),
      });
      const data = await parseJsonResponse<{
        id: number;
        start_time?: string;
        logs?: SessionLogResponse[];
        last_session_logs?: LastSessionSetLog[];
      }>(res);
      setSessionId(data.id);
      setLastSessionLogs(lastSessionLogMap(data.last_session_logs ?? []));

      // Load completed exercises from localStorage
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

      // Initialize Timer
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
    // Also unmark exercise as complete if it was marked
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

    // Optimistic update with resolved values
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

    // Send to API
    try {
      await apiFetch('/api/workouts/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          exercise_id: exerciseId,
          set_number: setNum,
          weight,
          reps,
        }),
      });

      hapticLight();

      // Start Rest Timer
      if (exercise.rest_seconds > 0) {
        startRestTimer(exercise.rest_seconds);
      }

      // Automatically mark exercise as complete if all sets are done
      if (exercise) {
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
        const exercise = routine?.exercises.find((e) => e.id === exerciseId);
        if (exercise && exercise.rest_seconds > 0) {
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
      const res = await apiFetch('/api/workouts/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          success,
        }),
      });

      await parseJsonResponse(res);
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
        const res = await apiFetch('/api/workouts/discard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        });
        await parseJsonResponse(res);
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

  const formatTime = formatWorkoutTime;

  if (loading) {
    return <WorkoutShellSkeleton />;
  }

  if (fetchError || !routine) {
    return (
      <div className="page-stack-tight mx-auto w-full max-w-5xl">
        <EmptyState
          icon={Dumbbell}
          title="Rutina no disponible"
          description={fetchError ?? 'No se encontró la rutina solicitada.'}
          action={<Button onClick={() => navigate('/routines')}>Volver a rutinas</Button>}
        />
      </div>
    );
  }

  if (routineBlockedToday) {
    return (
      <div className="page-stack-tight mx-auto w-full max-w-5xl">
        <EmptyState
          icon={CheckCircle}
          title="Rutina completada hoy"
          description={
            sessionError ??
            'Ya entrenaste esta rutina hoy. Puedes volver mañana o revisar tu historial.'
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="secondary" onClick={() => navigate('/history')}>
                Ver historial
              </Button>
              <Button onClick={() => navigate('/routines')}>Volver a rutinas</Button>
            </div>
          }
        />
      </div>
    );
  }

  const completedCount = routine.exercises.filter((e) => completedExercises[e.id]).length;
  const progressPct = routine.exercises.length
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

  return (
    <div
      className={cn('page-stack-tight mx-auto w-full max-w-5xl', isMobileFocus ? 'pb-36' : 'pb-20')}
    >
      <WorkoutCelebration active={showCelebration} />
      <Breadcrumbs
        className="hidden md:flex"
        items={[{ label: 'Rutinas', href: '/routines' }, { label: routine.name }]}
      />

      <div className="border-border bg-bg/95 sticky top-0 z-10 -mx-3 border-b px-3 backdrop-blur-sm sm:-mx-0 sm:px-0">
        <div className="flex items-center justify-between gap-2 py-2 sm:py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/routines')}
              className={cn(workoutIconBtn, 'shrink-0')}
              aria-label="Volver a rutinas"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-text truncate text-sm font-bold tracking-[-0.02em] sm:text-base md:text-lg">
                {routine.name}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    'bg-brand/10 text-brand inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums transition-all',
                    pausePulse ? 'animate-pulse' : ''
                  )}
                >
                  <Clock className="h-3 w-3 shrink-0" />
                  {formatTime(timer)}
                </span>
                {isPaused ? (
                  <span
                    className={cn(
                      'bg-surface-overlay text-text-secondary rounded-full px-2 py-0.5 text-[10px] font-medium transition-all',
                      pausePulse ? 'animate-pulse' : ''
                    )}
                  >
                    Pausado
                  </span>
                ) : null}
                <span className="text-text-secondary hidden text-[10px] font-medium sm:inline">
                  {completedCount}/{routine.exercises.length} ejercicios
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => {
                togglePause();
              }}
              disabled={!sessionId}
              className={cn(workoutIconBtn, 'hover:text-text')}
              aria-label={isPaused ? 'Reanudar cronómetro' : 'Pausar cronómetro'}
              title={isPaused ? 'Reanudar' : 'Pausar'}
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            <button
              ref={resetMenuAnchorRef}
              type="button"
              onClick={() => setResetMenuOpen((open) => !open)}
              disabled={!sessionId || isResetting}
              className={cn(workoutIconBtn, 'sm:hidden')}
              aria-label="Más acciones"
              aria-haspopup="menu"
              aria-expanded={resetMenuOpen}
              title="Acciones"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            <AnchoredMenu
              open={resetMenuOpen}
              onClose={() => setResetMenuOpen(false)}
              anchorRef={resetMenuAnchorRef}
              align="end"
              className="min-w-[14rem]"
            >
              <button
                type="button"
                role="menuitem"
                disabled={!sessionId || isResetting}
                className="text-danger hover:bg-danger/10 flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm disabled:opacity-60"
                onClick={() => {
                  setResetMenuOpen(false);
                  resetProgress();
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Reiniciar sesión
              </button>
            </AnchoredMenu>
            <button
              type="button"
              onClick={resetProgress}
              disabled={!sessionId || isResetting}
              className={cn(
                workoutIconBtn,
                'text-text-muted hover:text-text-secondary hidden sm:inline-flex'
              )}
              aria-label="Reiniciar sesión"
              title="Reiniciar"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <Button
              onClick={finishWorkout}
              disabled={!sessionId}
              size="sm"
              className="h-9 px-3 text-xs sm:px-4 sm:text-sm"
            >
              Finalizar
            </Button>
          </div>
        </div>
        <div className="pb-2.5">
          <div className="text-text-secondary mb-1 flex items-center justify-between text-[10px] font-medium sm:hidden">
            <span>Progreso</span>
            <span className="text-brand">{progressPct}%</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progreso de sesión ${progressPct}%`}
          >
            <div
              className="bg-brand h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {pendingSyncCount > 0 && (
        <div
          className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-800 dark:text-amber-200"
          role="status"
        >
          {pendingSyncCount} serie{pendingSyncCount === 1 ? '' : 's'} pendiente
          {pendingSyncCount === 1 ? '' : 's'} de sincronizar. Se enviarán al recuperar conexión.
        </div>
      )}

      {sessionError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400">
          {sessionError}
        </div>
      )}

      {setValidationError && (
        <div className="border-brand/30 bg-brand/10 text-brand dark:text-brand rounded-2xl border px-4 py-3 text-sm font-bold">
          {setValidationError}
        </div>
      )}

      <Modal
        open={isAddingExercise}
        onClose={() => {
          setIsAddingExercise(false);
          setAddExerciseError(null);
        }}
        title="Añadir Ejercicio"
        maxWidth="xl"
        scrollable
      >
        <div className="space-y-4">
          <Suspense
            fallback={
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            }
          >
            <ExercisePicker
              exercises={availableExercises}
              value={newExercise.exercise_id}
              onChange={(exerciseId) => {
                setNewExercise({ ...newExercise, exercise_id: exerciseId });
              }}
            />
          </Suspense>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Series</Label>
              <Input
                type="number"
                value={newExercise.sets}
                onChange={(e) => {
                  setNewExercise({
                    ...newExercise,
                    sets: parsePositiveInt(e.target.value, newExercise.sets),
                  });
                }}
              />
            </div>
            <div>
              <Label>Reps</Label>
              <Input
                type="number"
                value={newExercise.reps}
                onChange={(e) => {
                  setNewExercise({
                    ...newExercise,
                    reps: parsePositiveInt(e.target.value, newExercise.reps),
                  });
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Descanso (seg)</Label>
              <Input
                type="number"
                value={newExercise.rest_seconds}
                onChange={(e) => {
                  setNewExercise({
                    ...newExercise,
                    rest_seconds: parseNonNegativeInt(e.target.value, newExercise.rest_seconds),
                  });
                }}
              />
            </div>
            <div>
              <Label>Sugerencia</Label>
              <Input
                type="text"
                placeholder="Ej: Peso pesado"
                value={newExercise.weight_suggestion}
                onChange={(e) => {
                  setNewExercise({ ...newExercise, weight_suggestion: e.target.value });
                }}
              />
            </div>
          </div>
          {addExerciseError && <p className="text-sm text-red-500">{addExerciseError}</p>}
          <Button
            className="w-full"
            onClick={handleAddExercise}
            disabled={!newExercise.exercise_id}
          >
            Añadir a Rutina
          </Button>
        </div>
      </Modal>

      {isMobileFocus && !isResting && routine.exercises.length > 1 && (
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
              onClick={() => {
                setFocusedIndex((i) => Math.max(0, i - 1));
              }}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1 text-center">
              <p className="text-text-secondary truncate text-xs">
                {routine.exercises[focusedIndex]?.name}
              </p>
              <p className="text-brand text-sm font-semibold">
                {focusedIndex + 1} / {routine.exercises.length}
              </p>
              <div className="mt-1.5 flex flex-wrap justify-center gap-0.5">
                {routine.exercises.map((ex, i) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      setFocusedIndex(i);
                    }}
                    className="flex h-11 w-11 items-center justify-center"
                    aria-label={`Ejercicio ${i + 1}`}
                    aria-current={i === focusedIndex ? 'true' : undefined}
                  >
                    <span
                      className={cn(
                        'rounded-full transition-all',
                        i === focusedIndex
                          ? 'bg-brand h-2.5 w-5'
                          : 'bg-surface-overlay h-2.5 w-2.5',
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
              disabled={focusedIndex >= routine.exercises.length - 1}
              onClick={() => {
                setFocusedIndex((i) => Math.min(routine.exercises.length - 1, i + 1));
              }}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </nav>
      )}

      <div className="page-stack-loose">
        {routine.exercises.map((exercise, index) => (
          <article
            key={exercise.id}
            id={`active-workout-exercise-${exercise.id}`}
            className={cn(
              'rounded-card border-border bg-surface shadow-card border p-3 transition-all sm:p-4 md:p-6',
              completedExercises[exercise.id]
                ? 'scale-[0.98] opacity-50 ring-2 ring-emerald-500/50'
                : '',
              isMobileFocus && index !== focusedIndex && 'hidden'
            )}
          >
            <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-text flex min-w-0 items-center gap-3 text-lg font-bold">
                  <span className="brand-solid flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold not-italic">
                    {index + 1}
                  </span>
                  <span className="truncate">{exercise.name}</span>
                </h3>
                <p className="text-text-secondary mt-2 text-sm font-medium">
                  {formatMuscleGroupLabel(exercise.muscle_group)} · Descanso:{' '}
                  {exercise.rest_seconds}s
                </p>
                {exercise.weight_suggestion && (
                  <p className="text-brand mt-1 text-xs font-bold">
                    Consejo: {exercise.weight_suggestion}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  toggleExerciseComplete(exercise.id);
                }}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all',
                  completedExercises[exercise.id]
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                    : 'bg-surface-overlay text-text-secondary hover:bg-surface-raised'
                )}
              >
                <CheckCircle className="h-4 w-4" />
                {completedExercises[exercise.id] ? 'Hecho' : 'Completar'}
              </button>
            </div>

            {(exercise.description || exercise.execution || exercise.video_url) && (
              <div className="mb-4 space-y-3">
                {exercise.description && (
                  <p className="text-text-secondary text-xs italic">"{exercise.description}"</p>
                )}

                <div className="flex flex-wrap gap-2">
                  {exercise.video_url && (
                    <button
                      type="button"
                      onClick={() => {
                        toggleVideo(exercise.id);
                      }}
                      className={workoutChipBtn}
                    >
                      <Video className="h-3.5 w-3.5" />
                      {showVideo[exercise.id] ? 'Cerrar video' : 'Video guía'}
                    </button>
                  )}

                  {exercise.execution && (
                    <button
                      type="button"
                      className={workoutChipBtn}
                      onClick={() => {
                        setShowExecution((prev) => ({
                          ...prev,
                          [exercise.id]: !(prev[exercise.id] ?? false),
                        }));
                      }}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>
                        {(showExecution[exercise.id] ?? false) ? 'Ocultar' : 'Ver ejecución'}
                      </span>
                      <span className="bg-brand/10 text-brand dark:bg-brand/20 rounded px-1.5 py-0.5 text-[10px] font-bold">
                        {executionStepCount(exercise.execution)} pasos
                      </span>
                    </button>
                  )}
                </div>

                {exercise.execution && (
                  <Collapse open={showExecution[exercise.id] ?? false}>
                    <ExerciseExecutionSteps
                      execution={exercise.execution}
                      compact
                      className="w-full pt-1"
                    />
                  </Collapse>
                )}

                {exercise.video_url && (
                  <Collapse open={!!showVideo[exercise.id]}>
                    <div className="w-full pt-1">
                      <Suspense
                        fallback={
                          <div className="bg-surface-overlay h-40 animate-pulse rounded-xl" />
                        }
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

            <div className="space-y-4">
              <div className="text-text-muted grid grid-cols-[minmax(0,2.25rem)_1fr_1fr_auto] gap-2 px-1 text-center text-[11px] font-semibold sm:grid-cols-10 sm:gap-3 sm:px-2">
                <div className="sm:col-span-2">Serie</div>
                <div className="sm:col-span-3">kg</div>
                <div className="sm:col-span-3">Reps</div>
                <div className="flex items-center justify-center">
                  <CheckCircle className="h-3.5 w-3.5" />
                </div>
              </div>

              {Array.from({ length: exercise.sets }).map((_, i) => {
                const setNum = i + 1;
                const key = `${exercise.id}-${setNum}`;
                const isCompleted = logs[key]?.completed;
                const priorSet = getLastSetHint(exercise.id, setNum, lastSessionLogs);
                const lastHintLabel = !isCompleted && priorSet ? formatLastSetHint(priorSet) : null;
                const weightInputId = `workout-weight-${exercise.id}-${setNum}`;
                const repsInputId = `workout-reps-${exercise.id}-${setNum}`;

                return (
                  <div
                    key={setNum}
                    className={`grid grid-cols-[minmax(0,2.25rem)_1fr_1fr_auto] items-center gap-2 rounded-2xl p-1.5 transition-all sm:grid-cols-10 sm:gap-3 ${isCompleted ? 'bg-emerald-500/5 opacity-70' : 'bg-surface-overlay/40'}`}
                  >
                    <div className="flex justify-center sm:col-span-2">
                      <span className="border-border bg-surface flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white">
                        {setNum}
                      </span>
                    </div>
                    <div className="min-w-0 sm:col-span-3">
                      <Input
                        id={weightInputId}
                        type="number"
                        inputMode="decimal"
                        enterKeyHint="next"
                        placeholder={priorSet ? String(priorSet.weight) : '0'}
                        className="min-h-[40px] py-2 text-center text-base font-bold sm:min-h-[44px] sm:py-3 sm:text-lg md:py-2 md:text-base"
                        value={logs[key]?.weight || ''}
                        onChange={(e) => {
                          handleLogChange(exercise.id, setNum, 'weight', e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById(repsInputId)?.focus();
                          }
                        }}
                        disabled={isCompleted}
                        aria-label={`Peso serie ${setNum}`}
                      />
                      {lastHintLabel ? (
                        <p className="text-text-muted dark:text-text-secondary mt-0.5 truncate text-center text-[10px]">
                          {lastHintLabel}
                        </p>
                      ) : null}
                    </div>
                    <div className="min-w-0 sm:col-span-3">
                      <Input
                        id={repsInputId}
                        type="number"
                        inputMode="numeric"
                        enterKeyHint="done"
                        placeholder={priorSet ? String(priorSet.reps) : exercise.reps.toString()}
                        className="min-h-[40px] py-2 text-center text-base font-bold sm:min-h-[44px] sm:py-3 sm:text-lg md:py-2 md:text-base"
                        value={logs[key]?.reps || ''}
                        onChange={(e) => {
                          handleLogChange(exercise.id, setNum, 'reps', e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void toggleSetComplete(exercise.id, setNum);
                          }
                        }}
                        disabled={isCompleted}
                        aria-label={`Repeticiones serie ${setNum}`}
                      />
                    </div>
                    <div className="flex justify-center sm:col-span-2">
                      {isCompleted ? (
                        <button
                          type="button"
                          onClick={() => {
                            editSet(exercise.id, setNum);
                          }}
                          className="bg-brand/10 text-brand hover:bg-brand/20 flex h-9 w-9 items-center justify-center rounded-lg p-0 shadow-sm transition-all"
                          title="Editar serie"
                          aria-label={`Editar serie ${setNum}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void toggleSetComplete(exercise.id, setNum)}
                          className="hover:text-brand hover:border-brand border-border bg-surface text-text-muted flex h-9 w-9 items-center justify-center rounded-lg border p-0 shadow-sm transition-all dark:bg-zinc-800"
                          aria-label={`Marcar serie ${setNum} como hecha`}
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {exercise.sets > 1 && !logs[`${exercise.id}-${exercise.sets}`]?.completed && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveLastSet(exercise.id)}
                    className="border-border bg-surface text-text-muted flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition-all hover:border-red-200 hover:text-red-600 dark:bg-zinc-800 dark:hover:border-red-500/30 dark:hover:text-red-400"
                    aria-label="Eliminar última serie"
                    title="Eliminar última serie"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  handleAddSet(exercise.id);
                }}
                className="hover:text-brand hover:bg-brand/5 hover:border-brand/50 border-border text-text-muted mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-2.5 text-xs font-medium transition-all"
              >
                <Plus className="h-4 w-4" />
                Añadir Serie
              </button>
            </div>
          </article>
        ))}
      </div>

      <Modal
        open={isFinishing}
        onClose={() => {
          if (isSubmittingFinish) return;
          setIsFinishing(false);
          setFinishError(null);
        }}
        title={<>¡Felicidades!</>}
      >
        <div className="mb-5 text-center">
          <div className="brand-solid ring-brand/10 mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg ring-4">
            <CheckCircle className="h-8 w-8" />
          </div>
          <p className="text-text text-sm font-semibold">¿Completaste tu rutina exitosamente?</p>
          <div className="mt-3 flex items-center justify-center gap-2 text-[11px]">
            <span className="bg-brand/10 text-brand rounded-full px-2.5 py-1 font-semibold">
              {formatTime(timer)}
            </span>
            <span className="bg-surface-overlay text-text-secondary rounded-full px-2.5 py-1 font-medium">
              {completedCount}/{routine.exercises.length} ejercicios
            </span>
          </div>
          <div className="border-border bg-surface-raised/80 mt-3 rounded-xl border px-3 py-2">
            <p className="text-text-secondary text-[11px] font-medium">
              {completedSets} serie{completedSets === 1 ? '' : 's'} registradas
              <span className="text-text-muted mx-2">·</span>
              {totalVolumeKg.toLocaleString('es-VE')} kg de volumen total
            </p>
          </div>
        </div>

        {finishError && (
          <p className="mb-4 text-center text-sm font-bold text-red-500">{finishError}</p>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void confirmFinish(true)}
            disabled={isSubmittingFinish}
            className="group flex w-full items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 transition-all hover:border-emerald-500 disabled:opacity-60 dark:border-emerald-500/25 dark:bg-emerald-500/10"
          >
            <div className="text-left">
              <p className="font-semibold text-emerald-600 dark:text-emerald-500">Sí, la logré</p>
              <p className="mt-0.5 text-xs font-medium text-emerald-600/65 dark:text-emerald-500/65">
                Todas las series completadas
              </p>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-500 transition-all group-hover:bg-emerald-500 group-hover:text-white">
              <CheckCircle className="h-4 w-4" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => void confirmFinish(false)}
            disabled={isSubmittingFinish}
            className="group border-border bg-surface-raised hover:border-border flex w-full items-center justify-between rounded-xl border px-4 py-4 transition-all disabled:opacity-60"
          >
            <div className="text-left">
              <p className="text-text-secondary font-semibold">No completamente</p>
              <p className="text-text-muted mt-0.5 text-xs font-medium">
                Faltaron algunos ejercicios
              </p>
            </div>
            <div className="bg-surface-overlay group-hover:bg-text-muted h-2.5 w-2.5 rounded-full transition-all" />
          </button>

          <Button
            variant="ghost"
            className="mt-1 w-full"
            size="sm"
            disabled={isSubmittingFinish}
            onClick={() => {
              setIsFinishing(false);
            }}
          >
            Volver al entrenamiento
          </Button>
        </div>
      </Modal>

      <Modal
        open={showResetConfirm}
        onClose={() => {
          setShowResetConfirm(false);
        }}
        title="Descartar y reiniciar"
      >
        <p className="text-text-secondary mb-6 text-sm">
          Se eliminará esta sesión incompleta (no quedará en el historial) y podrás empezar de cero.
        </p>
        <div className="flex gap-4">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => {
              setShowResetConfirm(false);
            }}
            disabled={isResetting}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => void confirmResetProgress()}
            disabled={isResetting}
          >
            {isResetting ? 'Reiniciando…' : 'Descartar y reiniciar'}
          </Button>
        </div>
      </Modal>

      {isResting && (
        <RestTimerOverlay
          restTimer={restTimer}
          restDuration={restDuration}
          onAddTime={addRestTime}
          onSkip={skipRest}
          notificationsEnabled={hasNotificationPermission() || notifPermission === 'granted'}
          canRequestNotifications={
            typeof Notification !== 'undefined' && notifPermission === 'default'
          }
          onRequestNotifications={() => void requestRestNotifications()}
        />
      )}
    </div>
  );
}
