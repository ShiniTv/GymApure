import React, { useState, useEffect } from 'react';
import { apiFetch, resolveMediaUrl } from '../lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, CheckCircle, Clock, Save, Play, Video, Plus, X, BookOpen, Edit2 } from 'lucide-react';

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

export default function ActiveWorkout() {
  const { id } = useParams(); // Routine ID
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [logs, setLogs] = useState<Record<string, LogEntry>>({});
  const [completedExercises, setCompletedExercises] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState(0);
  
  // Rest Timer State
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restDuration, setRestDuration] = useState(0);
  const [showVideo, setShowVideo] = useState<Record<number, boolean>>({});

  // Add Exercise State
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);
  const [newExercise, setNewExercise] = useState({
    exercise_id: '',
    sets: 3,
    reps: 10,
    rest_seconds: 60,
    weight_suggestion: ''
  });

  useEffect(() => {
    if (!id) return;
    // Fetch routine details
    apiFetch(`/api/routines/${id}`)
      .then(res => res.json())
      .then(data => {
        setRoutine(data);
        setLoading(false);
      })
      .catch(err => console.error(err));

    // Workout Timer
    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (user && routine && !sessionId && !loading) {
      startSession(routine.id);
    }
  }, [user, routine, sessionId, loading]);

  // Rest Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResting && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => prev - 1);
      }, 1000);
    } else if (restTimer === 0) {
      setIsResting(false);
    }
    return () => clearInterval(interval);
  }, [isResting, restTimer]);

  // Save progress to localStorage
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(`active_workout_logs_${sessionId}`, JSON.stringify(logs));
      localStorage.setItem(`active_workout_completed_exercises_${sessionId}`, JSON.stringify(completedExercises));
    }
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
      .then(res => res.json())
      .then(data => setAvailableExercises(data))
      .catch(err => console.error(err));
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

      if (res.ok) {
        setIsAddingExercise(false);
        // Refresh routine
        apiFetch(`/api/routines/${id}`)
          .then(res => res.json())
          .then(data => setRoutine(data));
        // Reset form
        setNewExercise({
          exercise_id: '',
          sets: 3,
          reps: 10,
          rest_seconds: 60,
          weight_suggestion: ''
        });
      }
    } catch (err) {
      console.error('Failed to add exercise', err);
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
      const data = await res.json();
      setSessionId(data.id);

      // Load completed exercises from localStorage
      const savedCompletedStr = localStorage.getItem(`active_workout_completed_exercises_${sessionId || data.id}`);
      if (savedCompletedStr) {
        try {
          setCompletedExercises(JSON.parse(savedCompletedStr));
        } catch (e) {
          console.error('Failed to parse saved completed exercises', e);
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
      if (data.logs && Array.isArray(data.logs)) {
        const initialLogs: Record<string, LogEntry> = {};
        const maxSetsPerExercise: Record<number, number> = {};

        data.logs.forEach((log: any) => {
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
      console.error('Failed to start session', err);
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
      alert('Please enter weight and reps');
      return;
    }

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
        }
      }

    } catch (err) {
      console.error('Failed to log set', err);
      // Revert on error (simplified)
    }
  };

  const [isFinishing, setIsFinishing] = useState(false);
  const [successStatus, setSuccessStatus] = useState<boolean | null>(null);

  const finishWorkout = async () => {
    if (!sessionId) {
      alert('Error: Sesión no iniciada. Intenta recargar la página.');
      return;
    }
    
    if (successStatus === null) {
      setIsFinishing(true);
      return;
    }

    try {
      const res = await apiFetch('/api/workouts/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id: sessionId,
          success: successStatus 
        }),
      });
      
      if (res.ok) {
        // Clear local storage
        localStorage.removeItem(`active_workout_logs_${sessionId}`);
        localStorage.removeItem(`active_workout_sets_${sessionId}`);
        localStorage.removeItem(`active_workout_completed_exercises_${sessionId}`);
        
        navigate('/routines');
      } else {
        const errorData = await res.json();
        alert(`Error al finalizar entrenamiento: ${errorData.error || 'Inténtalo de nuevo'}`);
      }
    } catch (err) {
      console.error('Failed to finish workout', err);
      alert('Error de conexión al finalizar el entrenamiento.');
    }
  };

  const resetProgress = () => {
    if (confirm('¿Estás seguro de que quieres vaciar todos los campos y reiniciar el progreso no guardado?')) {
      if (sessionId) {
        localStorage.removeItem(`active_workout_logs_${sessionId}`);
        localStorage.removeItem(`active_workout_sets_${sessionId}`);
        localStorage.removeItem(`active_workout_completed_exercises_${sessionId}`);
      }
      // Re-start session by clearing sessionId and reloading routine
      setSessionId(null);
      setTimer(0);
      setLogs({});
      setCompletedExercises({});
      window.location.reload();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || !routine) return <div className="p-6 text-zinc-500 dark:text-zinc-400">Cargando entrenamiento...</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md py-4 z-10 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/routines')} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-500 dark:text-zinc-400">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic leading-none">{routine.name}</h1>
            <div className="flex items-center text-orange-600 dark:text-orange-500 text-sm font-black font-mono tracking-tighter mt-1">
              <Clock className="h-4 w-4 mr-1" />
              {formatTime(timer)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={resetProgress}
            className="px-3 py-2 text-sm font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-all active:scale-95 uppercase tracking-wider"
          >
            Reiniciar
          </button>
          <button 
            onClick={finishWorkout}
            disabled={!sessionId}
            className={`px-4 py-2 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95 uppercase tracking-wider ${
              sessionId ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-900/20' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
            }`}
          >
            Finalizar
          </button>
        </div>
      </div>

      {user?.role === 'trainer' && (
        <div className="flex justify-end px-2">
          <button
            onClick={() => {
              setIsAddingExercise(true);
              apiFetchAvailableExercises();
            }}
            className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white px-5 py-3 rounded-2xl font-black text-xs transition-all shadow-md active:scale-95 uppercase tracking-widest"
          >
            <Plus className="h-5 w-5" />
            Añadir Ejercicio
          </button>
        </div>
      )}

      {/* Add Exercise Modal */}
      {isAddingExercise && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Añadir Ejercicio</h2>
              <button onClick={() => setIsAddingExercise(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Seleccionar Ejercicio</label>
                <select 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  value={newExercise.exercise_id}
                  onChange={(e) => setNewExercise({...newExercise, exercise_id: e.target.value})}
                >
                  <option value="">Selecciona un ejercicio...</option>
                  {availableExercises.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.muscle_group})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Series</label>
                  <input 
                    type="number"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    value={newExercise.sets}
                    onChange={(e) => setNewExercise({...newExercise, sets: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Reps</label>
                  <input 
                    type="number"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    value={newExercise.reps}
                    onChange={(e) => setNewExercise({...newExercise, reps: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Descanso (seg)</label>
                  <input 
                    type="number"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    value={newExercise.rest_seconds}
                    onChange={(e) => setNewExercise({...newExercise, rest_seconds: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Sugerencia</label>
                  <input 
                    type="text"
                    placeholder="Ej: Peso pesado"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    value={newExercise.weight_suggestion}
                    onChange={(e) => setNewExercise({...newExercise, weight_suggestion: e.target.value})}
                  />
                </div>
              </div>
              
              <button 
                onClick={handleAddExercise}
                disabled={!newExercise.exercise_id}
                className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-900/20"
              >
                Añadir a Rutina
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {routine.exercises.map((exercise, index) => (
          <div key={exercise.id} className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm transition-all ${completedExercises[exercise.id] ? 'opacity-50 ring-2 ring-emerald-500/50 scale-[0.98]' : 'hover:shadow-md'}`}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-3 uppercase italic tracking-tighter">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 text-white text-xs font-bold not-italic">
                    {index + 1}
                  </span>
                  {exercise.name}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 font-medium">{exercise.muscle_group.toUpperCase()} • Descanso: {exercise.rest_seconds}s</p>
                {exercise.weight_suggestion && (
                  <div className="mt-1 space-y-2">
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-bold">PRO TIP: {exercise.weight_suggestion}</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          console.log(`Buy request for: ${exercise.name}`);
                          alert(`Buy equipment for: ${exercise.name}`);
                        }}
                        className="px-4 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest rounded-lg hover:opacity-90 active:bg-zinc-700 dark:active:bg-zinc-200 active:scale-95 transition-all shadow-sm"
                      >
                        Buy
                      </button>
                      <button 
                        onClick={() => {
                          console.log(`Rent request for: ${exercise.name}`);
                          alert(`Rent equipment for: ${exercise.name}`);
                        }}
                        className="px-4 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 active:bg-zinc-300 dark:active:bg-zinc-600 active:scale-95 transition-all"
                      >
                        Rent
                      </button>
                    </div>
                  </div>
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
                          className="text-[10px] flex items-center gap-1.5 font-black text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors uppercase tracking-widest bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded-lg border border-zinc-100 dark:border-zinc-800"
                        >
                          <Video className="h-3.5 w-3.5" />
                          {showVideo[exercise.id] ? 'Cerrar Video' : 'Video Guía'}
                        </button>
                      )}

                      {exercise.execution && (
                        <button 
                          className="text-[10px] flex items-center gap-1.5 font-black text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors uppercase tracking-widest bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded-lg border border-zinc-100 dark:border-zinc-800"
                          onClick={() => {
                            const details = document.getElementById(`exec-${exercise.id}`);
                            if (details) details.classList.toggle('hidden');
                          }}
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          Ejecución
                        </button>
                      )}
                    </div>
                    
                    {exercise.execution && (
                      <div id={`exec-${exercise.id}`} className="hidden w-full mt-3 p-4 bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 rounded-2xl animate-in slide-in-from-top-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-2">Pasos a seguir</h4>
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
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
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
              <div className="grid grid-cols-10 gap-3 text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-black tracking-widest text-center px-2">
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
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-black text-sm shadow-sm border border-zinc-100 dark:border-zinc-700">
                        {setNum}
                      </span>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2 py-2.5 text-center text-zinc-900 dark:text-white font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all shadow-sm"
                        value={logs[key]?.weight || ''}
                        onChange={(e) => handleLogChange(exercise.id, setNum, 'weight', e.target.value)}
                        disabled={isCompleted}
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder={exercise.reps.toString()}
                        className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2 py-2.5 text-center text-zinc-900 dark:text-white font-bold focus:ring-2 focus:ring-orange-500 outline-none transition-all shadow-sm"
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
                className="w-full py-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-orange-500 hover:bg-orange-500/5 hover:border-orange-500/50 rounded-2xl transition-all border-2 border-dashed border-zinc-100 dark:border-zinc-800 mt-2"
              >
                <Plus className="h-4 w-4" />
                Añadir Serie
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Finish Workout Modal */}
      {isFinishing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center mb-8">
              <div className="h-16 w-16 bg-orange-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-orange-500/20">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">¡Felicidades!</h2>
              <p className="text-zinc-500 font-medium">¿Completaste tu rutina exitosamente?</p>
            </div>
            
            <div className="space-y-4">
              <button 
                onClick={() => {
                  setSuccessStatus(true);
                  // Success status is set, now call finish
                  setTimeout(() => {
                    const btn = document.getElementById('final-confirm-btn');
                    if (btn) btn.click();
                  }, 100);
                }}
                className="w-full flex items-center justify-between p-6 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl group hover:border-emerald-500 transition-all"
              >
                <div className="text-left">
                  <p className="font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-tight">Sí, la logré</p>
                  <p className="text-[10px] text-emerald-600/60 dark:text-emerald-500/60 font-black uppercase tracking-widest">Todos los sets completados</p>
                </div>
                <div className="h-6 w-6 rounded-full border-2 border-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <CheckCircle className="h-4 w-4" />
                </div>
              </button>

              <button 
                onClick={() => {
                  setSuccessStatus(false);
                  setTimeout(() => {
                    const btn = document.getElementById('final-confirm-btn');
                    if (btn) btn.click();
                  }, 100);
                }}
                className="w-full flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl group hover:border-zinc-400 transition-all"
              >
                <div className="text-left">
                  <p className="font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-tight">No completamente</p>
                  <p className="text-[10px] text-zinc-500/60 font-black uppercase tracking-widest text">Faltaron algunos ejercicios</p>
                </div>
              </button>

              <button 
                id="final-confirm-btn"
                className="hidden"
                onClick={finishWorkout}
              ></button>

              <button 
                onClick={() => setIsFinishing(false)}
                className="w-full py-4 text-xs font-black text-zinc-400 hover:text-zinc-900 dark:hover:text-white uppercase tracking-widest transition-all mt-4"
              >
                Volver al entrenamiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rest Timer Overlay */}
      {isResting && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 z-50 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-8">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Descanso</span>
              <span className="text-3xl font-black text-zinc-900 dark:text-white font-mono italic tracking-tighter">{formatTime(restTimer)}</span>
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
                className="flex-1 py-3 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
              >
                +30s
              </button>
              <button 
                onClick={skipRest}
                className="flex-2 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-900/20"
              >
                Saltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
