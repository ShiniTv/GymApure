import React, { useState, useEffect } from 'react';
import { apiFetch, parseJsonResponse, resolveMediaUrl } from '../lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, CheckCircle, Clock, Save, Play, Video, Plus, BookOpen, Edit2, Dumbbell, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Modal, Label, Input, Select, Spinner, EmptyState, Breadcrumbs } from '../components/ui';
import { clientLogger } from '../lib/clientLogger';
import { useIsMobile } from '../hooks/useIsMobile';
import { cn } from '../lib/utils';

interface Exercise {
  id: number;
  name: string;
  muscle_group: string;
  description?: string;
  execution?: string;
  video_url: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  weight_suggestion: string;
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
  
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [logs, setLogs] = useState<Record<string, LogEntry>>({});
  const [completedExercises, setCompletedExercises] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
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
  const isMobileFocus = useIsMobile();

  // Add Exercise State
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>([]);
  const [newExercise, setNewExercise] = useState({
    exercise_id: '',
    sets: 3,
    reps: 10,
    rest_seconds: 60,
    weight_suggestion: ''
  });

  useEffect(() => {
    if (!id) return;
    apiFetch(`/api/routines/${id}`)
      .then((res) => parseJsonResponse<Routine>(res))
      .then((data) => {
        setRoutine(data);
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
    if (isPaused) return;
    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  useEffect(() => {
    if (user && routine && !sessionId && !loading && !isResetting) {
      startSession(routine.id);
    }
  }, [user, routine, sessionId, loading, isResetting]);

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
    return () => clearInterval(interval);
  }, [isResting]);

  // Persist progress — debounced to avoid blocking the main thread on every keystroke
  useEffect(() => {
    if (!sessionId) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(`active_workout_logs_${sessionId}`, JSON.stringify(logs));
      localStorage.setItem(`active_workout_completed_exercises_${sessionId}`, JSON.stringify(completedExercises));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [logs, completedExercises, sessionId]);

  const toggleExerciseComplete = (exerciseId: number) => {
    const isNowComplete = !completedExercises[exerciseId];
    setCompletedExercises(prev => ({
      ...prev,
      [exerciseId]: isNowComplete
    }));

    if (isNowComplete) {
      // Mark all sets as completed in the logs state for UI consistency
      const exercise = routine?.exercises.find(e => e.id === exerciseId);
      if (exercise) {
        setLogs(prev => {
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
                completed: true
              };
            }
          }
          return newLogs;
        });
      }
      if (isMobileFocus && routine) {
        const idx = routine.exercises.findIndex((e) => e.id === exerciseId);
        if (idx >= 0 && idx < routine.exercises.length - 1) {
          window.setTimeout(() => setFocusedIndex(idx + 1), 300);
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
    setRestTimer(prev => prev + seconds);
    setRestDuration(prev => prev + seconds);
  };

  const toggleVideo = (id: number) => {
    setShowVideo(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.startsWith('/uploads/') || url.startsWith('/api/files/')) {
      return resolveMediaUrl(url);
    }
    return url;
  };

  const apiFetchAvailableExercises = () => {
    apiFetch('/api/exercises')
      .then((res) => parseJsonResponse<ExerciseOption[]>(res))
      .then((data) => setAvailableExercises(Array.isArray(data) ? data : []))
      .catch((err) => clientLogger.error('Failed to fetch exercises catalog', err));
  };

  const reloadRoutine = () => {
    if (!id) return;
    apiFetch(`/api/routines/${id}`)
      .then((res) => parseJsonResponse<Routine>(res))
      .then((data) => setRoutine(data))
      .catch((err) => clientLogger.error('Failed to reload routine', err));
  };

  const handleAddExercise = async () => {
    if (!newExercise.exercise_id) return;

    try {
      const res = await apiFetch(`/api/routines/${id}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newExercise,
          exercise_id: parseInt(newExercise.exercise_id)
        }),
      });

      await parseJsonResponse(res);
      setIsAddingExercise(false);
      reloadRoutine();
      setNewExercise({
        exercise_id: '',
        sets: 3,
        reps: 10,
        rest_seconds: 60,
        weight_suggestion: '',
      });
    } catch (err) {
      clientLogger.error('Failed to add exercise to routine', err);
    }
  };

  const handleAddSet = (exerciseId: number) => {
    setRoutine(prev => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: prev.exercises.map(e => 
          e.id === exerciseId ? { ...e, sets: e.sets + 1 } : e
        )
      };
    });
  };

  const startSession = async (routineId: number) => {
    if (!user) return;
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
      const savedCompletedStr = localStorage.getItem(`active_workout_completed_exercises_${sessionId || data.id}`);
      if (savedCompletedStr) {
        try {
          setCompletedExercises(JSON.parse(savedCompletedStr));
        } catch (e) {
          clientLogger.error('Failed to parse saved completed exercises', e);
        }
      }
      
      // Initialize Timer
      if (data.start_time) {
        // Append 'Z' to treat as UTC if missing
        const startTimeStr = data.start_time.endsWith('Z') ? data.start_time : `${data.start_time}Z`;
        const startTime = new Date(startTimeStr).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setTimer(elapsed > 0 ? elapsed : 0);
      }

      // Initialize Logs
      if (Array.isArray(data.logs)) {
        const initialLogs: Record<string, LogEntry> = {};
        const maxSetsPerExercise: Record<number, number> = {};

        data.logs.forEach((log) => {
          const key = `${log.exercise_id}-${log.set_number}`;
          initialLogs[key] = {
            exercise_id: log.exercise_id,
            set_number: log.set_number,
            weight: log.weight.toString(),
            reps: log.reps.toString(),
            completed: true
          };

          // Track max set number
          if (!maxSetsPerExercise[log.exercise_id] || log.set_number > maxSetsPerExercise[log.exercise_id]) {
            maxSetsPerExercise[log.exercise_id] = log.set_number;
          }
        });
        setLogs(initialLogs);

        // Update routine sets if logs have more sets
        setRoutine(prev => {
          if (!prev) return null;
          return {
            ...prev,
            exercises: prev.exercises.map(e => {
              const maxSet = maxSetsPerExercise[e.id] || 0;
              return maxSet > e.sets ? { ...e, sets: maxSet } : e;
            })
          };
        });
      }

    } catch (err) {
      clientLogger.error('Failed to start workout session', err);
      setSessionError('No se pudo iniciar la sesión. Recarga la página para reintentar.');
    }
  };

  const handleLogChange = (exerciseId: number, setNum: number, field: 'weight' | 'reps', value: string) => {
    const key = `${exerciseId}-${setNum}`;
    setLogs(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        exercise_id: exerciseId,
        set_number: setNum,
        [field]: value,
        completed: prev[key]?.completed || false
      }
    }));
  };

  const editSet = (exerciseId: number, setNum: number) => {
    const key = `${exerciseId}-${setNum}`;
    setLogs(prev => ({
      ...prev,
      [key]: { ...prev[key], completed: false }
    }));
    // Also unmark exercise as complete if it was marked
    setCompletedExercises(prev => ({
      ...prev,
      [exerciseId]: false
    }));
  };

  const toggleSetComplete = async (exerciseId: number, setNum: number) => {
    const key = `${exerciseId}-${setNum}`;
    const entry = logs[key];
    
    if (!entry || !entry.weight || !entry.reps) {
      setSetValidationError('Ingresa peso y repeticiones antes de marcar la serie.');
      return;
    }
    setSetValidationError(null);

    // Optimistic update
    setLogs(prev => ({
      ...prev,
      [key]: { ...prev[key], completed: true }
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
          weight: parseFloat(entry.weight),
          reps: parseInt(entry.reps)
        }),
      });

      // Start Rest Timer
      const exercise = routine?.exercises.find(e => e.id === exerciseId);
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
          setCompletedExercises(prev => ({ ...prev, [exerciseId]: true }));
          if (isMobileFocus && routine) {
            const idx = routine.exercises.findIndex((e) => e.id === exerciseId);
            if (idx >= 0 && idx < routine.exercises.length - 1) {
              window.setTimeout(() => setFocusedIndex(idx + 1), 400);
            }
          }
        }
      }

    } catch (err) {
      clientLogger.error('Failed to log workout set', err);
      // Revert on error (simplified)
    }
  };

  const [isFinishing, setIsFinishing] = useState(false);

  const confirmFinish = async (success: boolean) => {
    if (!sessionId) {
      setFinishError('Sesión no iniciada. Recarga la página e intenta de nuevo.');
      return;
    }

    setFinishError(null);
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
      setIsFinishing(false);
      navigate('/routines');
    } catch (err) {
      clientLogger.error('Failed to finish workout', err);
      setFinishError(err instanceof Error ? err.message : 'Error al finalizar el entrenamiento.');
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (fetchError || !routine) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={Dumbbell}
          title="Rutina no disponible"
          description={fetchError ?? 'No se encontró la rutina solicitada.'}
          action={
            <Button onClick={() => navigate('/routines')}>
              Volver a rutinas
            </Button>
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
    <div className={cn('space-y-6', isMobileFocus ? 'pb-36' : 'pb-20')}>
      <Breadcrumbs
        className="hidden md:flex"
        items={[
          { label: 'Rutinas', href: '/routines' },
          { label: routine.name },
        ]}
      />

      <div className="flex items-center justify-between sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md py-3 md:py-4 z-10 border-b border-zinc-200 dark:border-zinc-800 -mx-1 px-1">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <button onClick={() => navigate('/routines')} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-500 dark:text-zinc-400 shrink-0">
            <ArrowLeft className="h-5 w-5 md:h-6 md:w-6" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base md:text-xl font-bold text-zinc-900 dark:text-white truncate">{routine.name}</h1>
            <div className="flex items-center text-orange-600 dark:text-orange-500 text-sm font-semibold font-mono mt-0.5">
              <Clock className="h-3.5 w-3.5 mr-1 shrink-0" />
              {formatTime(timer)}
              {isPaused && (
                <span className="ml-2 text-xs text-zinc-400">Pausado</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            disabled={!sessionId}
            className="hidden sm:inline-flex px-3 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-white transition-all disabled:opacity-40"
          >
            {isPaused ? 'Reanudar' : 'Pausar'}
          </button>
          <button 
            onClick={resetProgress}
            disabled={!sessionId || isResetting}
            className="hidden sm:inline-flex px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-all disabled:opacity-40"
          >
            Reiniciar
          </button>
          <Button onClick={finishWorkout} disabled={!sessionId} size="sm">
            Finalizar
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
          <span>Progreso de sesión</span>
          <span className="text-orange-600 dark:text-orange-500">{completedCount}/{routine.exercises.length} ejercicios · {progressPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-500"
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
        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-700 dark:text-orange-400">
          {setValidationError}
        </div>
      )}

      <Modal
        open={isAddingExercise}
        onClose={() => setIsAddingExercise(false)}
        title="Añadir Ejercicio"
        maxWidth="xl"
        scrollable
      >
        <div className="space-y-4">
          <div>
            <Label>Seleccionar Ejercicio</Label>
            <Select
              value={newExercise.exercise_id}
              onChange={(e) => setNewExercise({ ...newExercise, exercise_id: e.target.value })}
            >
              <option value="">Selecciona un ejercicio...</option>
              {availableExercises.map((e) => (
                <option key={e.id} value={e.id}>{e.name} ({e.muscle_group})</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Series</Label>
              <Input
                type="number"
                value={newExercise.sets}
                onChange={(e) => setNewExercise({ ...newExercise, sets: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Reps</Label>
              <Input
                type="number"
                value={newExercise.reps}
                onChange={(e) => setNewExercise({ ...newExercise, reps: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Descanso (seg)</Label>
              <Input
                type="number"
                value={newExercise.rest_seconds}
                onChange={(e) => setNewExercise({ ...newExercise, rest_seconds: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Sugerencia</Label>
              <Input
                type="text"
                placeholder="Ej: Peso pesado"
                value={newExercise.weight_suggestion}
                onChange={(e) => setNewExercise({ ...newExercise, weight_suggestion: e.target.value })}
              />
            </div>
          </div>
          <Button className="w-full" onClick={handleAddExercise} disabled={!newExercise.exercise_id}>
            Añadir a Rutina
          </Button>
        </div>
      </Modal>

      {isMobileFocus && routine.exercises.length > 1 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-zinc-50/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0"
              disabled={focusedIndex === 0}
              onClick={() => setFocusedIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 text-center min-w-0">
              <p className="text-xs text-zinc-500 truncate">
                {routine.exercises[focusedIndex]?.name}
              </p>
              <p className="text-sm font-semibold text-orange-600">
                {focusedIndex + 1} / {routine.exercises.length}
              </p>
              <div className="flex justify-center gap-1 mt-1.5">
                {routine.exercises.map((ex, i) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => setFocusedIndex(i)}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      i === focusedIndex ? 'w-5 bg-orange-500' : 'w-1.5 bg-zinc-300 dark:bg-zinc-700',
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
              onClick={() => setFocusedIndex((i) => Math.min(routine.exercises.length - 1, i + 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {routine.exercises.map((exercise, index) => (
          <div
            key={exercise.id}
            className={cn(
              'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 md:p-6 shadow-sm transition-all',
              completedExercises[exercise.id] ? 'opacity-50 ring-2 ring-emerald-500/50 scale-[0.98]' : 'hover:shadow-md',
              isMobileFocus && index !== focusedIndex && 'hidden'
            )}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 text-white text-xs font-bold not-italic">
                    {index + 1}
                  </span>
                  {exercise.name}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 font-medium capitalize">{exercise.muscle_group} · Descanso: {exercise.rest_seconds}s</p>
                {exercise.weight_suggestion && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 font-bold mt-1">
                    Consejo: {exercise.weight_suggestion}
                  </p>
                )}
                
                {(exercise.description || exercise.execution || exercise.video_url) && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {exercise.description && (
                      <div className="w-full">
                         <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                          "{exercise.description}"
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      {exercise.video_url && (
                        <button 
                          onClick={() => toggleVideo(exercise.id)}
                          className="text-xs flex items-center gap-1.5 font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded-lg border border-zinc-100 dark:border-zinc-800"
                        >
                          <Video className="h-3.5 w-3.5" />
                          {showVideo[exercise.id] ? 'Cerrar Video' : 'Video Guía'}
                        </button>
                      )}

                      {exercise.execution && (
                        <button 
                          type="button"
                          className="text-xs flex items-center gap-1.5 font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded-lg border border-zinc-100 dark:border-zinc-800"
                          onClick={() => setShowExecution((prev) => ({ ...prev, [exercise.id]: !prev[exercise.id] }))}
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          {showExecution[exercise.id] ? 'Ocultar' : 'Ejecución'}
                        </button>
                      )}
                    </div>
                    
                    {exercise.execution && showExecution[exercise.id] && (
                      <div className="w-full mt-3 p-4 bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 rounded-2xl animate-in slide-in-from-top-2">
                        <h4 className="label-caps text-orange-600 dark:text-orange-400 mb-2">Pasos a seguir</h4>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                          {exercise.execution}
                        </p>
                      </div>
                    )}

                    {showVideo[exercise.id] && exercise.video_url && (
                      <div className="mt-4 aspect-video w-full rounded-2xl overflow-hidden bg-zinc-100 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 shadow-inner">
                        <iframe 
                          src={getEmbedUrl(exercise.video_url)} 
                          className="w-full h-full" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen
                          title={exercise.name}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => toggleExerciseComplete(exercise.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  completedExercises[exercise.id]
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                <CheckCircle className="h-4 w-4" />
                {completedExercises[exercise.id] ? 'Hecho' : 'Completar'}
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-10 gap-3 text-xs text-zinc-400 dark:text-zinc-500 font-medium text-center px-2">
                <div className="col-span-2">Serie</div>
                <div className="col-span-3">kg</div>
                <div className="col-span-3">Reps</div>
                <div className="col-span-2">Ok</div>
              </div>
              
              {Array.from({ length: exercise.sets }).map((_, i) => {
                const setNum = i + 1;
                const key = `${exercise.id}-${setNum}`;
                const isCompleted = logs[key]?.completed;

                return (
                  <div key={setNum} className={`grid grid-cols-10 gap-3 items-center p-2 rounded-2xl transition-all ${isCompleted ? 'bg-emerald-500/5 opacity-70' : 'bg-zinc-50 dark:bg-zinc-800/30'}`}>
                    <div className="col-span-2 flex justify-center">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold text-sm shadow-sm border border-zinc-100 dark:border-zinc-700">
                        {setNum}
                      </span>
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="0"
                        className="text-center font-bold text-lg md:text-sm py-4 md:py-3 min-h-[48px]"
                        value={logs[key]?.weight || ''}
                        onChange={(e) => handleLogChange(exercise.id, setNum, 'weight', e.target.value)}
                        disabled={isCompleted}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder={exercise.reps.toString()}
                        className="text-center font-bold text-lg md:text-sm py-4 md:py-3 min-h-[48px]"
                        value={logs[key]?.reps || ''}
                        onChange={(e) => handleLogChange(exercise.id, setNum, 'reps', e.target.value)}
                        disabled={isCompleted}
                      />
                    </div>
                    <div className="col-span-2 flex justify-center">
                      {isCompleted ? (
                        <button
                          onClick={() => editSet(exercise.id, setNum)}
                          className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 transition-all shadow-sm"
                          title="Editar serie"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleSetComplete(exercise.id, setNum)}
                          className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600 hover:text-orange-500 hover:border-orange-500 border border-zinc-100 dark:border-zinc-700 transition-all shadow-sm"
                        >
                          <CheckCircle className="h-6 w-6" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => handleAddSet(exercise.id)}
                className="w-full py-3 flex items-center justify-center gap-2 text-xs font-medium text-zinc-400 hover:text-orange-500 hover:bg-orange-500/5 hover:border-orange-500/50 rounded-2xl transition-all border-2 border-dashed border-zinc-100 dark:border-zinc-800 mt-2"
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
        onClose={() => { setIsFinishing(false); setFinishError(null); }}
        title={<>¡Felicidades!</>}
      >
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-orange-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-orange-500/20">
            <CheckCircle className="h-8 w-8" />
          </div>
          <p className="text-zinc-500 font-medium">¿Completaste tu rutina exitosamente?</p>
          <p className="text-xs font-medium text-orange-600 mt-3">
            {formatTime(timer)} · {completedCount}/{routine.exercises.length} ejercicios
          </p>
        </div>

        {finishError && (
          <p className="text-sm font-bold text-red-500 mb-4 text-center">{finishError}</p>
        )}

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => void confirmFinish(true)}
            className="w-full flex items-center justify-between p-6 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl group hover:border-emerald-500 transition-all"
          >
            <div className="text-left">
              <p className="font-semibold text-emerald-600 dark:text-emerald-500">Sí, la logré</p>
              <p className="text-xs text-emerald-600/60 dark:text-emerald-500/60 font-medium">Todos los sets completados</p>
            </div>
            <div className="h-6 w-6 rounded-full border-2 border-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
              <CheckCircle className="h-4 w-4" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => void confirmFinish(false)}
            className="w-full flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl group hover:border-zinc-400 transition-all"
          >
            <div className="text-left">
              <p className="font-semibold text-zinc-600 dark:text-zinc-400">No completamente</p>
              <p className="text-xs text-zinc-500/60 font-medium">Faltaron algunos ejercicios</p>
            </div>
          </button>

          <Button variant="ghost" className="w-full mt-4" size="sm" onClick={() => setIsFinishing(false)}>
            Volver al entrenamiento
          </Button>
        </div>
      </Modal>

      <Modal
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Reiniciar progreso"
      >
        <p className="text-sm text-zinc-500 mb-6">
          Se cerrará la sesión actual y comenzará una nueva desde cero. El tiempo y el progreso se reiniciarán.
        </p>
        <div className="flex gap-4">
          <Button variant="ghost" className="flex-1" onClick={() => setShowResetConfirm(false)} disabled={isResetting}>
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1" onClick={() => void confirmResetProgress()} disabled={isResetting}>
            {isResetting ? 'Reiniciando…' : 'Reiniciar'}
          </Button>
        </div>
      </Modal>

      {/* Rest Timer Overlay */}
      {isResting && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 z-50 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-8">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-zinc-400">Descanso</span>
              <span className="text-3xl font-bold text-zinc-900 dark:text-white font-mono tabular-nums">{formatTime(restTimer)}</span>
            </div>
            
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-3 mb-6 overflow-hidden">
              <div 
                className="bg-orange-500 h-full rounded-full transition-all duration-1000 ease-linear shadow-[0_0_12px_rgba(249,115,22,0.5)]"
                style={{ width: `${(restTimer / restDuration) * 100}%` }}
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => addRestTime(30)}
                className="flex-1 py-3 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-2xl text-xs font-semibold transition-all"
              >
                +30s
              </button>
              <Button
                onClick={skipRest}
                className="flex-[2]"
                size="sm"
              >
                Saltar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
