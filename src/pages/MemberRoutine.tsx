import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Calendar, Plus, X, Edit, Trash2, UserMinus, Scale, History } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';

interface Routine {
  id: number;
  name: string;
  difficulty: string;
  assigned_at: string;
  start_date?: string;
  end_date?: string;
  exercises?: Exercise[];
}

interface Exercise {
  id: number;
  routine_exercise_id: number;
  name: string;
  muscle_group: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  weight_suggestion: string;
}

interface User {
  id: number;
  full_name: string;
  email: string;
  initial_weight?: number | null;
  height?: number | null;
  goal?: string | null;
}

interface Subscription {
  membership_name: string;
  days_remaining: number;
  end_date: string;
  status: string;
}

interface Measurement {
  id: number;
  date: string;
  weight: number | null;
  body_fat_percentage: number | null;
  waist: number | null;
  arm: number | null;
  leg: number | null;
}

export default function MemberRoutine() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [member, setMember] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingMeasurement, setIsAddingMeasurement] = useState(false);
  const [measurementForm, setMeasurementForm] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    body_fat_percentage: '',
    waist: '',
    arm: '',
    leg: '',
  });
  
  // Assignment Modal State
  const [isAssigning, setIsAssigning] = useState(false);
  const [availableRoutines, setAvailableRoutines] = useState<any[]>([]);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>('');
  const [assignDates, setAssignDates] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  
  // Create/Edit Routine State
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<number | null>(null);
  const [routineForm, setRoutineForm] = useState({ name: '', difficulty: 'Beginner' });

  // Exercise Management State
  const [expandedRoutineId, setExpandedRoutineId] = useState<number | null>(null);
  const [isEditingExercise, setIsEditingExercise] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
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
    Promise.all([
      apiFetch(`/api/users/${id}`).then(res => res.json()),
      apiFetch(`/api/users/${id}/routines`).then(res => res.json()),
      apiFetch(`/api/memberships/user/${id}`).then(res => res.ok ? res.json() : null),
      apiFetch(`/api/users/${id}/measurements`).then(res => res.json()),
    ]).then(([userData, routinesData, subData, measurementsData]) => {
      setMember(userData);
      setRoutines(Array.isArray(routinesData) ? routinesData : []);
      setSubscription(subData?.membership_name ? subData : null);
      setMeasurements(Array.isArray(measurementsData) ? measurementsData : []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [id]);

  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/api/users/${id}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: measurementForm.date,
          weight: measurementForm.weight ? parseFloat(measurementForm.weight) : null,
          body_fat_percentage: measurementForm.body_fat_percentage
            ? parseFloat(measurementForm.body_fat_percentage)
            : null,
          waist: measurementForm.waist ? parseFloat(measurementForm.waist) : null,
          arm: measurementForm.arm ? parseFloat(measurementForm.arm) : null,
          leg: measurementForm.leg ? parseFloat(measurementForm.leg) : null,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setMeasurements(prev => [created, ...prev]);
        setIsAddingMeasurement(false);
        setMeasurementForm({
          date: new Date().toISOString().split('T')[0],
          weight: '',
          body_fat_percentage: '',
          waist: '',
          arm: '',
          leg: '',
        });
      }
    } catch (err) {
      console.error('Failed to add measurement', err);
    }
  };

  const apiFetchAvailableRoutines = () => {
    apiFetch('/api/routines')
      .then(res => res.json())
      .then(data => setAvailableRoutines(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  const handleInlineUpdate = async (routineId: number, exercise: Exercise, field: 'sets' | 'reps', value: number) => {
    if (value === exercise[field]) return;

    try {
      const updatedExercise = { ...exercise, [field]: value };
      const res = await apiFetch(`/api/routines/${routineId}/exercises/${exercise.routine_exercise_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sets: updatedExercise.sets,
          reps: updatedExercise.reps,
          rest_seconds: updatedExercise.rest_seconds,
          weight_suggestion: updatedExercise.weight_suggestion
        }),
      });

      if (res.ok) {
        setRoutines(prev => prev.map(r => {
          if (r.id === routineId) {
            return {
              ...r,
              exercises: r.exercises?.map(e => e.routine_exercise_id === exercise.routine_exercise_id ? updatedExercise : e)
            };
          }
          return r;
        }));
      }
    } catch (err) {
      console.error('Failed to inline update exercise', err);
    }
  };

  const handleAssignRoutine = async () => {
    if (!selectedRoutineId || !user) return;

    try {
      const res = await apiFetch(`/api/users/${id}/routines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routine_id: parseInt(selectedRoutineId),
          assigned_by: user.id,
          start_date: assignDates.start_date,
          end_date: assignDates.end_date
        }),
      });

      if (res.ok) {
        setIsAssigning(false);
        // Refresh routines
        apiFetch(`/api/users/${id}/routines`)
          .then(res => res.json())
          .then(data => setRoutines(Array.isArray(data) ? data : []));
      }
    } catch (err) {
      console.error('Failed to assign routine', err);
    }
  };

  const handleCreateRoutine = async () => {
    if (!user || !routineForm.name) return;

    try {
      // 1. Create Routine
      const createRes = await apiFetch('/api/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: routineForm.name,
          difficulty: routineForm.difficulty,
          trainer_id: user.id
        }),
      });
      const createData = await createRes.json();

      if (createRes.ok) {
        // 2. Assign to User
        await apiFetch(`/api/users/${id}/routines`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            routine_id: createData.id,
            assigned_by: user.id,
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }),
        });

        setIsCreating(false);
        setRoutineForm({ name: '', difficulty: 'Beginner' });
        // Refresh routines
        apiFetch(`/api/users/${id}/routines`)
          .then(res => res.json())
          .then(data => setRoutines(Array.isArray(data) ? data : []));
      }
    } catch (err) {
      console.error('Failed to create routine', err);
    }
  };

  const handleUpdateRoutine = async () => {
    if (!editingRoutineId || !routineForm.name) return;

    try {
      const res = await apiFetch(`/api/routines/${editingRoutineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: routineForm.name,
          difficulty: routineForm.difficulty
        }),
      });

      if (res.ok) {
        setIsEditing(false);
        setEditingRoutineId(null);
        setRoutineForm({ name: '', difficulty: 'Beginner' });
        // Refresh routines
        apiFetch(`/api/users/${id}/routines`)
          .then(res => res.json())
          .then(data => setRoutines(Array.isArray(data) ? data : []));
      }
    } catch (err) {
      console.error('Failed to update routine', err);
    }
  };

  const handleUnassignRoutine = async (routineId: number) => {
    if (!confirm('¿Estás seguro de que deseas quitar esta rutina al usuario?')) return;

    try {
      const res = await apiFetch(`/api/users/${id}/routines/${routineId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Refresh routines
        apiFetch(`/api/users/${id}/routines`)
          .then(res => res.json())
          .then(data => setRoutines(Array.isArray(data) ? data : []));
      }
    } catch (err) {
      console.error('Failed to unassign routine', err);
    }
  };

  const openEditModal = (routine: Routine) => {
    setRoutineForm({ name: routine.name, difficulty: routine.difficulty });
    setEditingRoutineId(routine.id);
    setIsEditing(true);
  };

  const apiFetchAvailableExercises = () => {
    apiFetch('/api/exercises')
      .then(res => res.json())
      .then(data => setAvailableExercises(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  const toggleExpandRoutine = async (routineId: number) => {
    if (expandedRoutineId === routineId) {
      setExpandedRoutineId(null);
      return;
    }

    try {
      const res = await apiFetch(`/api/routines/${routineId}`);
      const data = await res.json();
      const exercises = Array.isArray(data?.exercises) ? data.exercises : [];
      setRoutines(prev => prev.map(r => r.id === routineId ? { ...r, exercises } : r));
      setExpandedRoutineId(routineId);
    } catch (err) {
      console.error('Failed to apiFetch routine exercises', err);
    }
  };

  const handleUpdateExercise = async () => {
    if (!editingExercise || !expandedRoutineId) return;

    try {
      const res = await apiFetch(`/api/routines/${expandedRoutineId}/exercises/${editingExercise.routine_exercise_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sets: editingExercise.sets,
          reps: editingExercise.reps,
          rest_seconds: editingExercise.rest_seconds,
          weight_suggestion: editingExercise.weight_suggestion
        }),
      });

      if (res.ok) {
        setIsEditingExercise(false);
        setEditingExercise(null);
        // Refresh exercises
        const refreshRes = await apiFetch(`/api/routines/${expandedRoutineId}`);
        const data = await refreshRes.json();
        setRoutines(prev => prev.map(r => r.id === expandedRoutineId ? { ...r, exercises: data.exercises } : r));
      }
    } catch (err) {
      console.error('Failed to update exercise', err);
    }
  };

  const handleDeleteExercise = async (routineId: number, routineExerciseId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este ejercicio de la rutina?')) return;

    try {
      const res = await apiFetch(`/api/routines/${routineId}/exercises/${routineExerciseId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Refresh exercises
        const refreshRes = await apiFetch(`/api/routines/${routineId}`);
        const data = await refreshRes.json();
        const exercises = Array.isArray(data?.exercises) ? data.exercises : [];
        setRoutines(prev => prev.map(r => r.id === routineId ? { ...r, exercises } : r));
      }
    } catch (err) {
      console.error('Failed to delete exercise', err);
    }
  };

  const handleAddExercise = async () => {
    if (!newExercise.exercise_id || !expandedRoutineId) return;

    try {
      const res = await apiFetch(`/api/routines/${expandedRoutineId}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newExercise,
          exercise_id: parseInt(newExercise.exercise_id)
        }),
      });

      if (res.ok) {
        setIsAddingExercise(false);
        setNewExercise({
          exercise_id: '',
          sets: 3,
          reps: 10,
          rest_seconds: 60,
          weight_suggestion: ''
        });
        // Refresh exercises
        const refreshRes = await apiFetch(`/api/routines/${expandedRoutineId}`);
        const data = await refreshRes.json();
        setRoutines(prev => prev.map(r => r.id === expandedRoutineId ? { ...r, exercises: data.exercises } : r));
      }
    } catch (err) {
      console.error('Failed to add exercise', err);
    }
  };

  if (loading) return <div className="text-zinc-500 dark:text-white p-6">Cargando...</div>;
  if (!member) return <div className="text-zinc-500 dark:text-white p-6">Miembro no encontrado</div>;

  return (
    <div className="space-y-6">
      <button 
        onClick={() => navigate('/members')}
        className="flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Miembros
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase whitespace-pre-line leading-tight">
            RUTINAS DE <span className="text-orange-500">{member.full_name?.toUpperCase()}</span>
          </h1>
          <p className="text-zinc-500 font-medium">Gestionar planes de entrenamiento personalizados</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate(`/members/${id}/history`)}
            className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 px-5 py-3 rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-105"
          >
            <History className="h-5 w-5" />
            Historial
          </button>
          <button 
            onClick={() => {
              setIsCreating(true);
              setRoutineForm({ name: '', difficulty: 'Beginner' });
            }}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-900/20 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            Crear Nueva
          </button>
          <button 
            onClick={() => {
              setIsAssigning(true);
              apiFetchAvailableRoutines();
            }}
            className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-3 rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-105"
          >
            <Plus className="h-5 w-5" />
            Asignar Existente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
          <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4">Perfil</h3>
          <div className="space-y-2 text-sm">
            {member.height != null && (
              <p><span className="text-zinc-500">Altura:</span> <span className="font-bold">{member.height} cm</span></p>
            )}
            {member.initial_weight != null && (
              <p><span className="text-zinc-500">Peso inicial:</span> <span className="font-bold">{member.initial_weight} kg</span></p>
            )}
            {member.goal && (
              <p><span className="text-zinc-500">Objetivo:</span> <span className="font-bold">{member.goal}</span></p>
            )}
            {!member.height && !member.initial_weight && !member.goal && (
              <p className="text-zinc-400 text-xs">Sin datos de perfil registrados.</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
          <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4">Membresía</h3>
          {subscription ? (
            <div>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-500 uppercase italic">{subscription.membership_name}</p>
              <p className="text-sm font-bold text-zinc-500 mt-2">{subscription.days_remaining} días restantes</p>
              <p className="text-[10px] text-zinc-400 mt-1">
                Vence {format(new Date(subscription.end_date), 'dd MMM yyyy', { locale: es })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Sin membresía activa</p>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Mediciones
            </h3>
            {(user?.role === 'admin' || user?.role === 'trainer') && (
              <button
                type="button"
                onClick={() => setIsAddingMeasurement(true)}
                className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-500"
              >
                + Registrar
              </button>
            )}
          </div>
          {measurements.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {measurements.slice(0, 5).map((m) => (
                <div key={m.id} className="flex justify-between text-xs border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <span className="font-bold text-zinc-600 dark:text-zinc-300">
                    {format(new Date(m.date), 'dd MMM yyyy', { locale: es })}
                  </span>
                  <span className="text-zinc-500">
                    {m.weight != null ? `${m.weight} kg` : '—'}
                    {m.body_fat_percentage != null ? ` · ${m.body_fat_percentage}% grasa` : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Sin mediciones registradas</p>
          )}
        </div>
      </div>

      {isAddingMeasurement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Nueva medición</h2>
              <button type="button" onClick={() => setIsAddingMeasurement(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddMeasurement} className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Fecha</label>
                <input
                  type="date"
                  value={measurementForm.date}
                  onChange={(e) => setMeasurementForm({ ...measurementForm, date: e.target.value })}
                  className="mt-1 w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={measurementForm.weight}
                    onChange={(e) => setMeasurementForm({ ...measurementForm, weight: e.target.value })}
                    className="mt-1 w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Grasa (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={measurementForm.body_fat_percentage}
                    onChange={(e) => setMeasurementForm({ ...measurementForm, body_fat_percentage: e.target.value })}
                    className="mt-1 w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Cintura (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={measurementForm.waist}
                    onChange={(e) => setMeasurementForm({ ...measurementForm, waist: e.target.value })}
                    className="mt-1 w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Brazo (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={measurementForm.arm}
                    onChange={(e) => setMeasurementForm({ ...measurementForm, arm: e.target.value })}
                    className="mt-1 w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest"
              >
                Guardar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(isCreating || isEditing) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{isCreating ? 'Crear Rutina' : 'Editar Rutina'}</h2>
              <button 
                onClick={() => {
                  setIsCreating(false);
                  setIsEditing(false);
                }} 
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Nombre de la Rutina</label>
                <input 
                  type="text"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                  value={routineForm.name}
                  onChange={(e) => setRoutineForm({...routineForm, name: e.target.value})}
                  placeholder="Ej: Piernas A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Dificultad</label>
                <select 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                  value={routineForm.difficulty}
                  onChange={(e) => setRoutineForm({...routineForm, difficulty: e.target.value})}
                >
                  <option value="Beginner">Principiante</option>
                  <option value="Intermediate">Intermedio</option>
                  <option value="Advanced">Avanzado</option>
                </select>
              </div>
              
              <button 
                onClick={isCreating ? handleCreateRoutine : handleUpdateRoutine}
                disabled={!routineForm.name}
                className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-900/20"
              >
                {isCreating ? 'Crear y Asignar' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
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
                    placeholder="Ej: Pesado"
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
                Añadir Ejercicio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Exercise Modal */}
      {isEditingExercise && editingExercise && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Editar {editingExercise.name}</h2>
              <button onClick={() => setIsEditingExercise(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Series</label>
                  <input 
                    type="number"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    value={editingExercise.sets}
                    onChange={(e) => setEditingExercise({...editingExercise, sets: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Reps</label>
                  <input 
                    type="number"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    value={editingExercise.reps}
                    onChange={(e) => setEditingExercise({...editingExercise, reps: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Descanso (seg)</label>
                  <input 
                    type="number"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                    value={editingExercise.rest_seconds}
                    onChange={(e) => setEditingExercise({...editingExercise, rest_seconds: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Sugerencia</label>
                  <input 
                    type="text"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                    value={editingExercise.weight_suggestion}
                    onChange={(e) => setEditingExercise({...editingExercise, weight_suggestion: e.target.value})}
                  />
                </div>
              </div>
              
              <button 
                onClick={handleUpdateExercise}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-900/20"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {isAssigning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Asignar Rutina</h2>
              <button onClick={() => setIsAssigning(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Seleccionar Rutina</label>
                <select 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                  value={selectedRoutineId}
                  onChange={(e) => setSelectedRoutineId(e.target.value)}
                >
                  <option value="">Selecciona una rutina...</option>
                  {availableRoutines.filter(ar => !routines.some(r => r.id === ar.id)).map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.difficulty})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Fecha Inicio</label>
                  <input 
                    type="date"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                    value={assignDates.start_date}
                    onChange={(e) => setAssignDates({...assignDates, start_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Fecha Fin</label>
                  <input 
                    type="date"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                    value={assignDates.end_date}
                    onChange={(e) => setAssignDates({...assignDates, end_date: e.target.value})}
                  />
                </div>
              </div>
              
              <button 
                onClick={handleAssignRoutine}
                disabled={!selectedRoutineId}
                className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-900/20"
              >
                Asignar Rutina
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {routines.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <Dumbbell className="h-12 w-12 text-zinc-200 dark:text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500">No hay rutinas asignadas aún.</p>
          </div>
        ) : (
          routines.map((routine) => (
            <div key={routine.id} className="col-span-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-500/10 rounded-xl">
                    <Dumbbell className="h-6 w-6 text-orange-600 dark:text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">{routine.name}</h3>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-500 mt-1 font-black uppercase tracking-widest">
                      <span className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {routine.difficulty}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        Vigencia: {routine.start_date ? new Date(routine.start_date).toLocaleDateString() : 'N/A'} - {routine.end_date ? new Date(routine.end_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleExpandRoutine(routine.id)}
                    className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                  >
                    {expandedRoutineId === routine.id ? 'Ocultar Ejercicios' : 'Ver Ejercicios'}
                  </button>
                  <button 
                    onClick={() => openEditModal(routine)}
                    className="p-2.5 text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-xl transition-all"
                    title="Editar Rutina"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => handleUnassignRoutine(routine.id)}
                    className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
                    title="Desvincular del Usuario"
                  >
                    <UserMinus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {expandedRoutineId === routine.id && (
                <div className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-6 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Ejercicios</h4>
                    <button 
                      onClick={() => {
                        setIsAddingExercise(true);
                        apiFetchAvailableExercises();
                      }}
                      className="flex items-center gap-2 text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-400 text-sm font-bold transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Añadir Ejercicio
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {routine.exercises?.map((exercise) => (
                      <div key={exercise.routine_exercise_id} className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 flex justify-between items-start shadow-sm transition-all hover:shadow-md">
                        <div>
                          <h5 className="font-bold text-zinc-900 dark:text-white uppercase tracking-tight italic">{exercise.name}</h5>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{exercise.muscle_group}</p>
                          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                            <div className="flex items-center gap-1.5 text-zinc-500 font-medium tracking-tight">
                              Series: 
                              <input 
                                type="number"
                                className="w-10 bg-zinc-100 dark:bg-zinc-700 border-none rounded-md px-1 py-0.5 text-center font-bold text-zinc-900 dark:text-white focus:ring-1 focus:ring-orange-500"
                                defaultValue={exercise.sets}
                                onBlur={(e) => handleInlineUpdate(routine.id, exercise, 'sets', parseInt(e.target.value))}
                                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                              />
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-500 font-medium tracking-tight">
                              Reps: 
                              <input 
                                type="number"
                                className="w-10 bg-zinc-100 dark:bg-zinc-700 border-none rounded-md px-1 py-0.5 text-center font-bold text-zinc-900 dark:text-white focus:ring-1 focus:ring-orange-500"
                                defaultValue={exercise.reps}
                                onBlur={(e) => handleInlineUpdate(routine.id, exercise, 'reps', parseInt(e.target.value))}
                                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                              />
                            </div>
                            <span className="text-zinc-500 font-medium tracking-tight">Descanso: <span className="text-zinc-900 dark:text-white font-bold">{exercise.rest_seconds}s</span></span>
                            {exercise.weight_suggestion && (
                              <span className="text-zinc-500 font-medium tracking-tight col-span-2 mt-1">Tip: <span className="text-orange-600 dark:text-orange-400 font-bold italic">{exercise.weight_suggestion}</span></span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => {
                              setEditingExercise(exercise);
                              setIsEditingExercise(true);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
                            title="Editar Ejercicio"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteExercise(routine.id, exercise.routine_exercise_id)}
                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Eliminar Ejercicio"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!routine.exercises || routine.exercises.length === 0) && (
                      <p className="text-zinc-500 text-sm italic col-span-full py-4 text-center">No hay ejercicios en esta rutina.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
