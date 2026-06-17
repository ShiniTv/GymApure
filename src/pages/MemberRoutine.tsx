import React, { useState, useEffect } from 'react';
import { apiFetch, parseJsonResponse, parseJsonOptional } from '../lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Calendar, Plus, Edit, Trash2, UserMinus, Scale, History } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Modal, PageHeader, Label, Input, Select } from '../components/ui';
import { clientLogger } from '../lib/clientLogger';

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

interface RoutineOption {
  id: number;
  name: string;
  difficulty: string;
}

interface ExerciseOption {
  id: number;
  name: string;
  muscle_group: string;
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
  const [availableRoutines, setAvailableRoutines] = useState<RoutineOption[]>([]);
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
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>([]);
  const [newExercise, setNewExercise] = useState({
    exercise_id: '',
    sets: 3,
    reps: 10,
    rest_seconds: 60,
    weight_suggestion: ''
  });

  const refreshUserRoutines = () =>
    apiFetch(`/api/users/${id}/routines`)
      .then((res) => parseJsonResponse<Routine[]>(res))
      .then((data) => setRoutines(Array.isArray(data) ? data : []));

  const refreshRoutineExercises = async (routineId: number) => {
    const res = await apiFetch(`/api/routines/${routineId}`);
    const data = await parseJsonResponse<{ exercises: Exercise[] }>(res);
    const exercises = Array.isArray(data.exercises) ? data.exercises : [];
    setRoutines((prev) => prev.map((r) => (r.id === routineId ? { ...r, exercises } : r)));
  };

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiFetch(`/api/users/${id}`).then((res) => parseJsonResponse<User>(res)),
      apiFetch(`/api/users/${id}/routines`).then((res) => parseJsonResponse<Routine[]>(res)),
      apiFetch(`/api/memberships/user/${id}`).then((res) => parseJsonOptional<Subscription>(res)),
      apiFetch(`/api/users/${id}/measurements`).then((res) => parseJsonResponse<Measurement[]>(res)),
    ])
      .then(([userData, routinesData, subData, measurementsData]) => {
        setMember(userData);
        setRoutines(Array.isArray(routinesData) ? routinesData : []);
        setSubscription(subData?.membership_name ? subData : null);
        setMeasurements(Array.isArray(measurementsData) ? measurementsData : []);
      })
      .catch((err) => clientLogger.error('Failed to load member routine context', err))
      .finally(() => setLoading(false));
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
      const created = await parseJsonResponse<Measurement>(res);
      setMeasurements((prev) => [created, ...prev]);
      setIsAddingMeasurement(false);
      setMeasurementForm({
        date: new Date().toISOString().split('T')[0],
        weight: '',
        body_fat_percentage: '',
        waist: '',
        arm: '',
        leg: '',
      });
    } catch (err) {
      clientLogger.error('Failed to add member measurement', err);
    }
  };

  const apiFetchAvailableRoutines = () => {
    apiFetch('/api/routines')
      .then((res) => parseJsonResponse<RoutineOption[]>(res))
      .then((data) => setAvailableRoutines(Array.isArray(data) ? data : []))
      .catch((err) => clientLogger.error('Failed to fetch routines catalog', err));
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

      await parseJsonResponse(res);
      setRoutines((prev) =>
        prev.map((r) => {
          if (r.id === routineId) {
            return {
              ...r,
              exercises: r.exercises?.map((e) =>
                e.routine_exercise_id === exercise.routine_exercise_id ? updatedExercise : e
              ),
            };
          }
          return r;
        })
      );
    } catch (err) {
      clientLogger.error('Failed to inline update routine exercise', err);
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

      await parseJsonResponse(res);
      setIsAssigning(false);
      await refreshUserRoutines();
    } catch (err) {
      clientLogger.error('Failed to assign routine to member', err);
    }
  };

  const handleCreateRoutine = async () => {
    if (!user || !routineForm.name) return;

    try {
      const createRes = await apiFetch('/api/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: routineForm.name,
          difficulty: routineForm.difficulty,
          trainer_id: user.id,
        }),
      });
      const createData = await parseJsonResponse<{ id: number }>(createRes);

      await parseJsonResponse(
        await apiFetch(`/api/users/${id}/routines`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            routine_id: createData.id,
            assigned_by: user.id,
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          }),
        })
      );

      setIsCreating(false);
      setRoutineForm({ name: '', difficulty: 'Beginner' });
      await refreshUserRoutines();
    } catch (err) {
      clientLogger.error('Failed to create routine for member', err);
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
          difficulty: routineForm.difficulty,
        }),
      });

      await parseJsonResponse(res);
      setIsEditing(false);
      setEditingRoutineId(null);
      setRoutineForm({ name: '', difficulty: 'Beginner' });
      await refreshUserRoutines();
    } catch (err) {
      clientLogger.error('Failed to update member routine', err);
    }
  };

  const handleUnassignRoutine = async (routineId: number) => {
    if (!confirm('¿Estás seguro de que deseas quitar esta rutina al usuario?')) return;

    try {
      const res = await apiFetch(`/api/users/${id}/routines/${routineId}`, {
        method: 'DELETE',
      });

      await parseJsonResponse(res);
      await refreshUserRoutines();
    } catch (err) {
      clientLogger.error('Failed to unassign routine from member', err);
    }
  };

  const openEditModal = (routine: Routine) => {
    setRoutineForm({ name: routine.name, difficulty: routine.difficulty });
    setEditingRoutineId(routine.id);
    setIsEditing(true);
  };

  const apiFetchAvailableExercises = () => {
    apiFetch('/api/exercises')
      .then((res) => parseJsonResponse<ExerciseOption[]>(res))
      .then((data) => setAvailableExercises(Array.isArray(data) ? data : []))
      .catch((err) => clientLogger.error('Failed to fetch exercise catalog', err));
  };

  const toggleExpandRoutine = async (routineId: number) => {
    if (expandedRoutineId === routineId) {
      setExpandedRoutineId(null);
      return;
    }

    try {
      await refreshRoutineExercises(routineId);
      setExpandedRoutineId(routineId);
    } catch (err) {
      clientLogger.error('Failed to fetch routine exercises', err);
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

      await parseJsonResponse(res);
      setIsEditingExercise(false);
      setEditingExercise(null);
      await refreshRoutineExercises(expandedRoutineId);
    } catch (err) {
      clientLogger.error('Failed to update routine exercise', err);
    }
  };

  const handleDeleteExercise = async (routineId: number, routineExerciseId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este ejercicio de la rutina?')) return;

    try {
      const res = await apiFetch(`/api/routines/${routineId}/exercises/${routineExerciseId}`, {
        method: 'DELETE',
      });

      await parseJsonResponse(res);
      await refreshRoutineExercises(routineId);
    } catch (err) {
      clientLogger.error('Failed to delete routine exercise', err);
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

      await parseJsonResponse(res);
      setIsAddingExercise(false);
      setNewExercise({
        exercise_id: '',
        sets: 3,
        reps: 10,
        rest_seconds: 60,
        weight_suggestion: ''
      });
      await refreshRoutineExercises(expandedRoutineId);
    } catch (err) {
      clientLogger.error('Failed to add exercise to routine', err);
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

      <PageHeader
        title={<>RUTINAS DE <span className="text-orange-500">{member.full_name?.toUpperCase()}</span></>}
        subtitle="Gestionar planes de entrenamiento personalizados"
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate(`/members/${id}/history`)}>
              <History className="h-5 w-5" />
              Historial
            </Button>
            <Button
              onClick={() => {
                setIsCreating(true);
                setRoutineForm({ name: '', difficulty: 'Beginner' });
              }}
            >
              <Plus className="h-5 w-5" />
              Crear Nueva
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setIsAssigning(true);
                apiFetchAvailableRoutines();
              }}
            >
              <Plus className="h-5 w-5" />
              Asignar Existente
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
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
        </Card>

        <Card>
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
        </Card>

        <Card>
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
        </Card>
      </div>

      <Modal
        open={isAddingMeasurement}
        onClose={() => setIsAddingMeasurement(false)}
        title="Nueva medición"
        maxWidth="xl"
        scrollable
      >
        <form onSubmit={handleAddMeasurement} className="space-y-4">
          <div>
            <Label>Fecha</Label>
            <Input
              type="date"
              value={measurementForm.date}
              onChange={(e) => setMeasurementForm({ ...measurementForm, date: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Peso (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={measurementForm.weight}
                onChange={(e) => setMeasurementForm({ ...measurementForm, weight: e.target.value })}
              />
            </div>
            <div>
              <Label>Grasa (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={measurementForm.body_fat_percentage}
                onChange={(e) => setMeasurementForm({ ...measurementForm, body_fat_percentage: e.target.value })}
              />
            </div>
            <div>
              <Label>Cintura (cm)</Label>
              <Input
                type="number"
                step="0.1"
                value={measurementForm.waist}
                onChange={(e) => setMeasurementForm({ ...measurementForm, waist: e.target.value })}
              />
            </div>
            <div>
              <Label>Brazo (cm)</Label>
              <Input
                type="number"
                step="0.1"
                value={measurementForm.arm}
                onChange={(e) => setMeasurementForm({ ...measurementForm, arm: e.target.value })}
              />
            </div>
          </div>
          <Button type="submit" className="w-full">
            Guardar
          </Button>
        </form>
      </Modal>

      <Modal
        open={isCreating || isEditing}
        onClose={() => {
          setIsCreating(false);
          setIsEditing(false);
        }}
        title={isCreating ? 'Crear Rutina' : 'Editar Rutina'}
      >
        <div className="space-y-4">
          <div>
            <Label>Nombre de la Rutina</Label>
            <Input
              type="text"
              value={routineForm.name}
              onChange={(e) => setRoutineForm({ ...routineForm, name: e.target.value })}
              placeholder="Ej: Piernas A"
            />
          </div>
          <div>
            <Label>Dificultad</Label>
            <Select
              value={routineForm.difficulty}
              onChange={(e) => setRoutineForm({ ...routineForm, difficulty: e.target.value })}
            >
              <option value="Beginner">Principiante</option>
              <option value="Intermediate">Intermedio</option>
              <option value="Advanced">Avanzado</option>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={isCreating ? handleCreateRoutine : handleUpdateRoutine}
            disabled={!routineForm.name}
          >
            {isCreating ? 'Crear y Asignar' : 'Guardar Cambios'}
          </Button>
        </div>
      </Modal>

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
                placeholder="Ej: Pesado"
                value={newExercise.weight_suggestion}
                onChange={(e) => setNewExercise({ ...newExercise, weight_suggestion: e.target.value })}
              />
            </div>
          </div>
          <Button className="w-full" onClick={handleAddExercise} disabled={!newExercise.exercise_id}>
            Añadir Ejercicio
          </Button>
        </div>
      </Modal>

      <Modal
        open={isEditingExercise && !!editingExercise}
        onClose={() => setIsEditingExercise(false)}
        title={editingExercise ? `Editar ${editingExercise.name}` : 'Editar Ejercicio'}
        maxWidth="xl"
        scrollable
      >
        {editingExercise && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Series</Label>
                <Input
                  type="number"
                  value={editingExercise.sets}
                  onChange={(e) => setEditingExercise({ ...editingExercise, sets: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Reps</Label>
                <Input
                  type="number"
                  value={editingExercise.reps}
                  onChange={(e) => setEditingExercise({ ...editingExercise, reps: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Descanso (seg)</Label>
                <Input
                  type="number"
                  value={editingExercise.rest_seconds}
                  onChange={(e) => setEditingExercise({ ...editingExercise, rest_seconds: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Sugerencia</Label>
                <Input
                  type="text"
                  value={editingExercise.weight_suggestion}
                  onChange={(e) => setEditingExercise({ ...editingExercise, weight_suggestion: e.target.value })}
                />
              </div>
            </div>
            <Button className="w-full" onClick={handleUpdateExercise}>
              Guardar Cambios
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        open={isAssigning}
        onClose={() => setIsAssigning(false)}
        title="Asignar Rutina"
      >
        <div className="space-y-4">
          <div>
            <Label>Seleccionar Rutina</Label>
            <Select value={selectedRoutineId} onChange={(e) => setSelectedRoutineId(e.target.value)}>
              <option value="">Selecciona una rutina...</option>
              {availableRoutines.filter((ar) => !routines.some((r) => r.id === ar.id)).map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.difficulty})</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={assignDates.start_date}
                onChange={(e) => setAssignDates({ ...assignDates, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={assignDates.end_date}
                onChange={(e) => setAssignDates({ ...assignDates, end_date: e.target.value })}
              />
            </div>
          </div>
          <Button className="w-full" onClick={handleAssignRoutine} disabled={!selectedRoutineId}>
            Asignar Rutina
          </Button>
        </div>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {routines.length === 0 ? (
          <Card className="col-span-full text-center py-12">
            <Dumbbell className="h-12 w-12 text-zinc-200 dark:text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500">No hay rutinas asignadas aún.</p>
          </Card>
        ) : (
          routines.map((routine) => (
            <div key={routine.id} className="col-span-full">
            <Card className="overflow-hidden" padding="none">
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
            </Card>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
