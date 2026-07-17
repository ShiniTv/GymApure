import React, { useState, useEffect, useRef } from 'react';
import { apiFetch, parseJsonResponse, ApiError } from '../lib/api';
import { useParams, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { Button, Modal, Label, Input, Spinner, EmptyState, Breadcrumbs } from '../components/ui';
import { ExercisePicker } from '../components/exercise/ExercisePicker';
import { clientLogger } from '../lib/clientLogger';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { cn } from '../lib/utils';
import { RestTimerOverlay } from './activeWorkout/RestTimerOverlay';
import { formatWorkoutTime } from './activeWorkout/utils';
import { ExerciseVideoPlayer } from '../components/exercise/ExerciseVideoPlayer';
import {
  ExerciseExecutionSteps,
  executionStepCount,
} from '../components/exercise/ExerciseExecutionSteps';
import { hapticLight, hapticSuccess } from '../lib/haptics';
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

export default function ActiveWorkout() {
  const { id } = useParams(); // Routine ID
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToastOptional();
  const memberStatsCtx = useMemberStatsOptional();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [logs, setLogs] = useState<Record<string, LogEntry>>({});
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

  // Rest Timer State
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restDuration, setRestDuration] = useState(0);
  const [showVideo, setShowVideo] = useState<Record<number, boolean>>({});
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const { isMobileShell: isMobileFocus } = useBreakpoint();
  const isStartingRef = useRef(false);
  const routineId = id ? Number(id) : null;
  const completedTodayIds = memberStatsCtx?.stats?.completedRoutineIdsToday ?? [];
  const isRoutineCompletedToday = routineId != null && completedTodayIds.includes(routineId);

  useWorkoutPageTitle(routine?.name);

  // Add Exercise State
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>([]);
  const [newExercise, setNewExercise] = useState(defaultRoutineExerciseForm);
  const [addExerciseError, setAddExerciseError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/api/routines/${id}`)
      .then((res) => parseJsonResponse<Routine>(res))
      .then((data) => {
        const exercises = (data.exercises ?? []).map((exercise) => ({
          ...exercise,
          set_prescription:
            parseSetPrescriptionFromApi(exercise.set_prescription) ??
            deriveSetPrescription(exercise.sets, exercise.reps),
        }));
        setRoutine({ ...data, exercises });
        setFetchError(null);
        setLoading(false);
      })
      .catch((err) => {
        clientLogger.error('Failed to fetch routine', err);
        setRoutine(null);
        setFetchError('No se pudo cargar la rutina. Verifica tu conexión e intenta de nuevo.');
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!isAddingExercise) return;
    apiFetch('/api/exercises')
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

  // Rest timer — single interval while resting (avoids re-creating interval every second)
  useEffect(() => {
    if (!isResting) return;
    const interval = setInterval(() => {
      setRestTimer((prev) => {
        if (prev <= 1) {
          setIsResting(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [isResting]);

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
    setRestDuration(seconds);
    setRestTimer(seconds);
    setIsResting(true);
  };

  const skipRest = () => {
    setIsResting(false);
    setRestTimer(0);
  };

  const addRestTime = (seconds: number) => {
    setRestTimer((prev) => prev + seconds);
    setRestDuration((prev) => prev + seconds);
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
      }>(res);
      setSessionId(data.id);

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
    const entry = logs[key];
    const weight = Number.parseFloat(entry?.weight ?? '');
    const reps = Number.parseInt(entry?.reps ?? '', 10);

    // Peso 0 es válido (peso corporal / rutina estática sin kg prescrito).
    if (!Number.isFinite(weight) || weight < 0 || !Number.isFinite(reps) || reps < 1) {
      setSetValidationError('Ingresa peso y repeticiones antes de marcar la serie.');
      return;
    }
    setSetValidationError(null);

    // Optimistic update
    setLogs((prev) => ({
      ...prev,
      [key]: { ...prev[key], completed: true },
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
      const exercise = routine?.exercises.find((e) => e.id === exerciseId);
      if (exercise && exercise.rest_seconds > 0) {
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
          if (isMobileFocus && routine) {
            const idx = routine.exercises.findIndex((e) => e.id === exerciseId);
            if (idx >= 0 && idx < routine.exercises.length - 1) {
              window.setTimeout(() => {
                setFocusedIndex(idx + 1);
              }, 400);
            }
          }
        }
      }
    } catch (err) {
      clientLogger.error('Failed to log workout set', err);
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
      const res = await apiFetch('/api/workouts/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          success,
        }),
      });

      await parseJsonResponse(res);
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
        navigate('/routines');
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

  const confirmResetProgress = async () => {
    setIsResetting(true);
    setSessionError(null);
    try {
      if (sessionId) {
        const res = await apiFetch('/api/workouts/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        });
        await parseJsonResponse(res);
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
    return (
      <div className="page-state-center">
        <Spinner />
      </div>
    );
  }

  if (fetchError || !routine) {
    return (
      <div className="page-stack">
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
      <div className="page-stack">
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

  return (
    <div className={cn('page-stack', isMobileFocus ? 'pb-36' : 'pb-20')}>
      <WorkoutCelebration active={showCelebration} />
      <Breadcrumbs
        className="hidden md:flex"
        items={[{ label: 'Rutinas', href: '/routines' }, { label: routine.name }]}
      />

      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white/80 py-2.5 backdrop-blur-md sm:py-3 dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex min-w-0 items-center gap-2 md:gap-4">
          <button
            onClick={() => navigate('/routines')}
            className="shrink-0 rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="h-5 w-5 md:h-6 md:w-6" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-zinc-900 md:text-xl dark:text-white">
              {routine.name}
            </h1>
            <div className="text-brand dark:text-brand mt-0.5 flex items-center font-mono text-sm font-semibold">
              <Clock className="mr-1 h-3.5 w-3.5 shrink-0" />
              {formatTime(timer)}
              {isPaused && (
                <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-300">Pausado</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setIsPaused((p) => !p);
            }}
            disabled={!sessionId}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40 sm:h-auto sm:w-auto sm:px-3 sm:py-2 sm:text-xs sm:font-semibold dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label={isPaused ? 'Reanudar cronómetro' : 'Pausar cronómetro'}
            title={isPaused ? 'Reanudar' : 'Pausar'}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            <span className="ml-0 hidden sm:ml-1 sm:inline">
              {isPaused ? 'Reanudar' : 'Pausar'}
            </span>
          </button>
          <button
            type="button"
            onClick={resetProgress}
            disabled={!sessionId || isResetting}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-40 sm:h-auto sm:w-auto sm:px-3 sm:py-2 sm:text-xs sm:font-semibold dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Reiniciar sesión"
            title="Reiniciar"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="ml-0 hidden sm:ml-1 sm:inline">Reiniciar</span>
          </button>
          <Button
            onClick={finishWorkout}
            disabled={!sessionId}
            size="sm"
            className="h-9 px-3 sm:h-auto sm:min-h-11"
          >
            Finalizar
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <span>Progreso de sesión</span>
          <span className="text-brand dark:text-brand">
            {completedCount}/{routine.exercises.length} ejercicios · {progressPct}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="bg-brand h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

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
          <ExercisePicker
            exercises={availableExercises}
            value={newExercise.exercise_id}
            onChange={(exerciseId) => {
              setNewExercise({ ...newExercise, exercise_id: exerciseId });
            }}
          />
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

      {isMobileFocus && routine.exercises.length > 1 && (
        <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-zinc-200 bg-zinc-50/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
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
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {routine.exercises[focusedIndex]?.name}
              </p>
              <p className="text-brand text-sm font-semibold">
                {focusedIndex + 1} / {routine.exercises.length}
              </p>
              <div className="mt-1.5 flex justify-center gap-1">
                {routine.exercises.map((ex, i) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      setFocusedIndex(i);
                    }}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      i === focusedIndex ? 'bg-brand w-5' : 'w-1.5 bg-zinc-300 dark:bg-zinc-700',
                      completedExercises[ex.id] && i !== focusedIndex && 'bg-emerald-500/60'
                    )}
                    aria-label={`Ejercicio ${i + 1}`}
                  />
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
        </div>
      )}

      <div className="page-stack-loose">
        {routine.exercises.map((exercise, index) => (
          <div
            key={exercise.id}
            className={cn(
              'rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all md:p-6 dark:border-zinc-800 dark:bg-zinc-900',
              completedExercises[exercise.id]
                ? 'scale-[0.98] opacity-50 ring-2 ring-emerald-500/50'
                : '',
              isMobileFocus && index !== focusedIndex && 'hidden'
            )}
          >
            <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="flex min-w-0 items-center gap-3 text-lg font-bold text-zinc-900 dark:text-white">
                  <span className="brand-solid flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold not-italic">
                    {index + 1}
                  </span>
                  <span className="truncate">{exercise.name}</span>
                </h3>
                <p className="mt-2 text-sm font-medium text-zinc-500 capitalize dark:text-zinc-400">
                  {exercise.muscle_group} · Descanso: {exercise.rest_seconds}s
                </p>
                {exercise.weight_suggestion && (
                  <p className="text-brand dark:text-brand mt-1 text-xs font-bold">
                    Consejo: {exercise.weight_suggestion}
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  toggleExerciseComplete(exercise.id);
                }}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  completedExercises[exercise.id]
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                }`}
              >
                <CheckCircle className="h-4 w-4" />
                {completedExercises[exercise.id] ? 'Hecho' : 'Completar'}
              </button>
            </div>

            {(exercise.description || exercise.execution || exercise.video_url) && (
              <div className="mb-4 space-y-3">
                {exercise.description && (
                  <p className="text-xs text-zinc-500 italic dark:text-zinc-400">
                    "{exercise.description}"
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {exercise.video_url && (
                    <button
                      onClick={() => {
                        toggleVideo(exercise.id);
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-100 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:text-white"
                    >
                      <Video className="h-3.5 w-3.5" />
                      {showVideo[exercise.id] ? 'Cerrar Video' : 'Video Guía'}
                    </button>
                  )}

                  {exercise.execution && (
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-100 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:text-white"
                      onClick={() => {
                        setShowExecution((prev) => ({
                          ...prev,
                          [exercise.id]: !(prev[exercise.id] ?? true),
                        }));
                      }}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>{(showExecution[exercise.id] ?? true) ? 'Ocultar' : 'Ejecución'}</span>
                      <span className="bg-brand/10 text-brand dark:bg-brand/20 rounded px-1.5 py-0.5 text-[10px] font-bold">
                        {executionStepCount(exercise.execution)} pasos
                      </span>
                    </button>
                  )}
                </div>

                {exercise.execution && (showExecution[exercise.id] ?? true) && (
                  <ExerciseExecutionSteps
                    execution={exercise.execution}
                    compact
                    className="w-full"
                  />
                )}

                {showVideo[exercise.id] && exercise.video_url && (
                  <div className="w-full">
                    <ExerciseVideoPlayer
                      url={exercise.video_url}
                      posterUrl={exercise.video_poster_url}
                      title={`${exercise.name} — video tutorial`}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-[minmax(0,2.5rem)_1fr_1fr_auto] gap-2 px-1 text-center text-xs font-medium text-zinc-400 sm:grid-cols-10 sm:gap-3 sm:px-2 dark:text-zinc-500">
                <div className="sm:col-span-2">Serie</div>
                <div className="sm:col-span-3">kg</div>
                <div className="sm:col-span-3">Reps</div>
                <div>Ok</div>
              </div>

              {Array.from({ length: exercise.sets }).map((_, i) => {
                const setNum = i + 1;
                const key = `${exercise.id}-${setNum}`;
                const isCompleted = logs[key]?.completed;

                return (
                  <div
                    key={setNum}
                    className={`grid grid-cols-[minmax(0,2.5rem)_1fr_1fr_auto] items-center gap-2 rounded-2xl p-2 transition-all sm:grid-cols-10 sm:gap-3 ${isCompleted ? 'bg-emerald-500/5 opacity-70' : 'bg-zinc-50 dark:bg-zinc-800/30'}`}
                  >
                    <div className="flex justify-center sm:col-span-2">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-100 bg-white text-sm font-semibold text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white">
                        {setNum}
                      </span>
                    </div>
                    <div className="min-w-0 sm:col-span-3">
                      <Input
                        type="number"
                        placeholder="0"
                        className="min-h-[44px] py-3 text-center text-base font-bold sm:min-h-[48px] sm:py-4 sm:text-lg md:py-3 md:text-sm"
                        value={logs[key]?.weight || ''}
                        onChange={(e) => {
                          handleLogChange(exercise.id, setNum, 'weight', e.target.value);
                        }}
                        disabled={isCompleted}
                      />
                    </div>
                    <div className="min-w-0 sm:col-span-3">
                      <Input
                        type="number"
                        placeholder={exercise.reps.toString()}
                        className="min-h-[44px] py-3 text-center text-base font-bold sm:min-h-[48px] sm:py-4 sm:text-lg md:py-3 md:text-sm"
                        value={logs[key]?.reps || ''}
                        onChange={(e) => {
                          handleLogChange(exercise.id, setNum, 'reps', e.target.value);
                        }}
                        disabled={isCompleted}
                      />
                    </div>
                    <div className="flex justify-center sm:col-span-2">
                      {isCompleted ? (
                        <button
                          onClick={() => {
                            editSet(exercise.id, setNum);
                          }}
                          className="bg-brand/10 text-brand hover:bg-brand/20 rounded-xl p-2.5 shadow-sm transition-all"
                          title="Editar serie"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleSetComplete(exercise.id, setNum)}
                          className="hover:text-brand hover:border-brand rounded-xl border border-zinc-100 bg-white p-2.5 text-zinc-300 shadow-sm transition-all dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-600"
                        >
                          <CheckCircle className="h-6 w-6" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => {
                  handleAddSet(exercise.id);
                }}
                className="hover:text-brand hover:bg-brand/5 hover:border-brand/50 mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-100 py-3 text-xs font-medium text-zinc-400 transition-all dark:border-zinc-800 dark:text-zinc-300"
              >
                <Plus className="h-4 w-4" />
                Añadir Serie
              </button>
            </div>
          </div>
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
        <div className="mb-8 text-center">
          <div className="brand-solid mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg shadow-zinc-900/20">
            <CheckCircle className="h-8 w-8" />
          </div>
          <p className="font-medium text-zinc-500 dark:text-zinc-400">
            ¿Completaste tu rutina exitosamente?
          </p>
          <p className="text-brand mt-3 text-xs font-medium">
            {formatTime(timer)} · {completedCount}/{routine.exercises.length} ejercicios
          </p>
        </div>

        {finishError && (
          <p className="mb-4 text-center text-sm font-bold text-red-500">{finishError}</p>
        )}

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => void confirmFinish(true)}
            disabled={isSubmittingFinish}
            className="group flex w-full items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 p-6 transition-all hover:border-emerald-500 disabled:opacity-60 dark:border-emerald-500/20 dark:bg-emerald-500/10"
          >
            <div className="text-left">
              <p className="font-semibold text-emerald-600 dark:text-emerald-500">Sí, la logré</p>
              <p className="text-xs font-medium text-emerald-600/60 dark:text-emerald-500/60">
                Todos los sets completados
              </p>
            </div>
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-emerald-500 transition-all group-hover:bg-emerald-500 group-hover:text-white">
              <CheckCircle className="h-4 w-4" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => void confirmFinish(false)}
            disabled={isSubmittingFinish}
            className="group flex w-full items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50 p-6 transition-all hover:border-zinc-400 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-800/50"
          >
            <div className="text-left">
              <p className="font-semibold text-zinc-600 dark:text-zinc-400">No completamente</p>
              <p className="text-xs font-medium text-zinc-500/60 dark:text-zinc-400/60">
                Faltaron algunos ejercicios
              </p>
            </div>
          </button>

          <Button
            variant="ghost"
            className="mt-4 w-full"
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
        title="Reiniciar progreso"
      >
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Se cerrará la sesión actual y comenzará una nueva desde cero. El tiempo y el progreso se
          reiniciarán.
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
            {isResetting ? 'Reiniciando…' : 'Reiniciar'}
          </Button>
        </div>
      </Modal>

      {isResting && (
        <RestTimerOverlay
          restTimer={restTimer}
          restDuration={restDuration}
          onAddTime={addRestTime}
          onSkip={skipRest}
        />
      )}
    </div>
  );
}
