import React, { useState, useEffect } from 'react';
import { apiFetch, parseJsonResponse, parseJsonOptional } from '../lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import { Dumbbell, Calendar, Plus, Edit, Trash2, UserMinus, Scale, History, MessageSquare, UtensilsCrossed } from 'lucide-react';
import { format } from 'date-fns';
import { dateLocale as es } from '../lib/dateLocale';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Modal, PageHeader, Label, Input, Select, Badge, Spinner, EmptyState, DifficultySelect, Breadcrumbs, Avatar, SegmentedControl, PageState, BackToDashboardLink } from '../components/ui';
import { clientLogger } from '../lib/clientLogger';
import { formatDifficulty } from '../lib/utils';

import type {
  Routine,
  Exercise,
  MemberUser as User,
  Subscription,
  Measurement,
  RoutineOption,
  ExerciseOption,
} from './memberRoutine/types';

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
  const [unassignTarget, setUnassignTarget] = useState<Routine | null>(null);
  const [deleteExerciseTarget, setDeleteExerciseTarget] = useState<{ routineId: number; exercise: Exercise } | null>(null);

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
  const [coachingTab, setCoachingTab] = useState<'rutinas' | 'perfil' | 'mediciones'>('rutinas');

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
    try {
      const res = await apiFetch(`/api/users/${id}/routines/${routineId}`, {
        method: 'DELETE',
      });

      await parseJsonResponse(res);
      setUnassignTarget(null);
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

  const confirmDeleteExercise = async () => {
    if (!deleteExerciseTarget) return;
    const { routineId, exercise } = deleteExerciseTarget;
    try {
      const res = await apiFetch(`/api/routines/${routineId}/exercises/${exercise.routine_exercise_id}`, {
        method: 'DELETE',
      });
      await parseJsonResponse(res);
      setDeleteExerciseTarget(null);
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

  if (loading) {
    return (
      <PageState>
        <Spinner />
        <p className="mt-3 text-zinc-500 text-xs">Cargando miembro…</p>
      </PageState>
    );
  }
  if (!member) return <div className="text-zinc-500 dark:text-white p-6">Miembro no encontrado</div>;

  return (
    <div className="page-stack-tight">
      <Breadcrumbs
        items={[
          { label: 'Miembros', href: '/members' },
          { label: member.full_name, href: `/members/${id}/routines` },
          { label: 'Rutinas' },
        ]}
      />

      <PageHeader
        compact
        title={
          <>
            Rutinas de <span className="text-brand">{member.full_name}</span>
          </>
        }
        subtitle="Planes personalizados"
        action={
          <div className="flex items-center gap-1.5 shrink-0">
            <BackToDashboardLink iconOnly className="sm:hidden" />
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 shrink-0 p-0"
              onClick={() => navigate(`/members/${id}/nutrition`)}
              aria-label="Nutrición"
              title="Nutrición"
            >
              <UtensilsCrossed className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 shrink-0 p-0"
              onClick={() => navigate(`/members/${id}/history`)}
              aria-label="Ver historial"
              title="Historial"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 shrink-0 p-0"
              onClick={() => navigate(`/messages?member=${id}`)}
              aria-label="Enviar mensaje al miembro"
              title="Mensaje"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              className="h-9 w-9 shrink-0 p-0"
              onClick={() => {
                setIsCreating(true);
                setRoutineForm({ name: '', difficulty: 'Beginner' });
              }}
              aria-label="Crear rutina"
              title="Nueva rutina"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-9 shrink-0 gap-1.5 px-2.5 sm:px-3"
              onClick={() => {
                setIsAssigning(true);
                apiFetchAvailableRoutines();
              }}
              aria-label="Asignar rutina existente"
              title="Asignar existente"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="text-xs font-semibold">Asignar existente</span>
            </Button>
          </div>
        }
      />

      <Card
        padding="sm"
        rounded="xl"
        className="sticky top-2 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={member.full_name} size="sm" className="shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{member.full_name}</p>
            <p className="text-[10px] sm:text-xs text-zinc-500 mt-0.5 truncate">
              {subscription
                ? `${subscription.membership_name} · ${subscription.days_remaining} días`
                : 'Sin membresía activa'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {member.goal && (
            <Badge variant="warning" className="text-[9px] px-1.5 py-0 max-w-[8rem] truncate">
              {member.goal}
            </Badge>
          )}
          {routines.length > 0 && (
            <Badge variant="default" className="text-[9px] px-1.5 py-0">
              {routines.length} rutina{routines.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </Card>

      <SegmentedControl
        variant="compact"
        fullWidth
        value={coachingTab}
        onChange={setCoachingTab}
        options={[
          { value: 'rutinas', label: 'Rutinas' },
          { value: 'perfil', label: 'Perfil' },
          { value: 'mediciones', label: 'Mediciones' },
        ]}
        className="w-full sm:w-auto"
      />

      {coachingTab === 'perfil' && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
        <Card padding="sm" rounded="xl">
          <h3 className="section-title mb-2.5">Perfil</h3>
          <div className="space-y-1.5 text-xs sm:text-sm">
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

        <Card padding="sm" rounded="xl">
          <h3 className="section-title mb-2.5">Membresía</h3>
          {subscription ? (
            <div>
              <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-500">{subscription.membership_name}</p>
              <p className="text-xs text-zinc-500 mt-1">{subscription.days_remaining} días restantes</p>
              <p className="text-xs text-zinc-400 mt-1">
                Vence {format(new Date(subscription.end_date), 'dd MMM yyyy', { locale: es })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Sin membresía activa</p>
          )}
        </Card>
      </div>
      )}

      {coachingTab === 'mediciones' && (
        <Card padding="sm" rounded="xl">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <h3 className="section-title flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5 text-brand" />
              Mediciones
            </h3>
            {(user?.role === 'admin' || user?.role === 'trainer') && (
              <Button
                type="button"
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={() => setIsAddingMeasurement(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Registrar</span>
              </Button>
            )}
          </div>
          {measurements.length > 0 ? (
            <div className="space-y-1">
              {measurements.map((m) => (
                <div key={m.id} className="flex justify-between gap-2 text-xs sm:text-sm border-b border-zinc-100 dark:border-zinc-800 py-2 last:border-0">
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
            <EmptyState icon={Scale} title="Sin mediciones" description="Registra la primera medición del miembro." />
          )}
        </Card>
      )}

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
            <DifficultySelect
              value={routineForm.difficulty}
              onChange={(difficulty) => setRoutineForm({ ...routineForm, difficulty })}
            />
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
                <option key={r.id} value={r.id}>{r.name} ({formatDifficulty(r.difficulty)})</option>
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

      <Modal
        open={!!unassignTarget}
        onClose={() => setUnassignTarget(null)}
        title="Quitar rutina"
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          ¿Quitar <strong>{unassignTarget?.name}</strong> de {member.full_name}?
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setUnassignTarget(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => unassignTarget && handleUnassignRoutine(unassignTarget.id)}
          >
            Quitar rutina
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!deleteExerciseTarget}
        onClose={() => setDeleteExerciseTarget(null)}
        title="Quitar ejercicio"
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          ¿Quitar <strong>{deleteExerciseTarget?.exercise.name}</strong> de esta rutina?
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setDeleteExerciseTarget(null)}>
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1" onClick={confirmDeleteExercise}>
            Quitar
          </Button>
        </div>
      </Modal>

      {coachingTab === 'rutinas' && (
      <div className="space-y-2.5">
        {routines.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Sin rutinas asignadas"
            description={`${member.full_name} aún no tiene planes de entrenamiento.`}
            action={
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  size="sm"
                  onClick={() => {
                    setIsCreating(true);
                    setRoutineForm({ name: '', difficulty: 'Beginner' });
                  }}
                >
                  Crear rutina
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setIsAssigning(true);
                    apiFetchAvailableRoutines();
                  }}
                >
                  Asignar existente
                </Button>
              </div>
            }
          />
        ) : (
          routines.map((routine) => {
            const isExpanded = expandedRoutineId === routine.id;
            const formatDate = (value: string | null | undefined) => {
              if (!value) return '—';
              try {
                return format(new Date(value), 'dd/MM/yy', { locale: es });
              } catch {
                return '—';
              }
            };

            return (
            <Card key={routine.id} padding="sm" rounded="xl" className="overflow-hidden">
              <div className="flex items-start gap-2.5">
                <div className="h-9 w-9 shrink-0 bg-brand/10 rounded-lg flex items-center justify-center">
                  <Dumbbell className="h-4 w-4 text-brand dark:text-brand" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white leading-tight truncate">
                      {routine.name}
                    </h3>
                    <Badge variant="default" className="shrink-0 text-[9px] px-1.5 py-0">
                      {formatDifficulty(routine.difficulty)}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1 tabular-nums">
                    <Calendar className="h-3 w-3 shrink-0" />
                    {formatDate(routine.start_date)} – {formatDate(routine.end_date)}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleExpandRoutine(routine.id)}
                    className={`h-8 w-8 inline-flex items-center justify-center rounded-lg transition-colors ${
                      isExpanded
                        ? 'text-brand bg-brand/10'
                        : 'text-zinc-400 hover:text-brand hover:bg-brand/10'
                    }`}
                    aria-label={isExpanded ? 'Ocultar ejercicios' : 'Ver ejercicios'}
                    title={isExpanded ? 'Ocultar ejercicios' : 'Ver ejercicios'}
                  >
                    <Dumbbell className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(routine)}
                    className="h-8 w-8 inline-flex items-center justify-center text-zinc-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                    aria-label={`Editar ${routine.name}`}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnassignTarget(routine)}
                    className="h-8 w-8 inline-flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    aria-label={`Quitar ${routine.name}`}
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Ejercicios</h4>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 px-2.5 text-xs"
                      onClick={() => {
                        setIsAddingExercise(true);
                        apiFetchAvailableExercises();
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Añadir</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {routine.exercises?.map((exercise) => (
                      <div key={exercise.routine_exercise_id} className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 rounded-lg px-2.5 py-2 flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h5 className="font-semibold text-xs text-zinc-900 dark:text-white truncate">{exercise.name}</h5>
                          <p className="text-[10px] text-zinc-500 capitalize">{exercise.muscle_group}</p>
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-zinc-500">
                            <label className="inline-flex items-center gap-1">
                              Sets
                              <input
                                type="number"
                                className="w-9 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded px-1 py-0.5 text-center font-semibold text-zinc-900 dark:text-white focus:ring-1 focus:ring-brand"
                                defaultValue={exercise.sets}
                                onBlur={(e) => handleInlineUpdate(routine.id, exercise, 'sets', parseInt(e.target.value))}
                                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                              />
                            </label>
                            <label className="inline-flex items-center gap-1">
                              Reps
                              <input
                                type="number"
                                className="w-9 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded px-1 py-0.5 text-center font-semibold text-zinc-900 dark:text-white focus:ring-1 focus:ring-brand"
                                defaultValue={exercise.reps}
                                onBlur={(e) => handleInlineUpdate(routine.id, exercise, 'reps', parseInt(e.target.value))}
                                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                              />
                            </label>
                            <span>Rst <span className="font-semibold text-zinc-800 dark:text-zinc-200">{exercise.rest_seconds}s</span></span>
                          </div>
                        </div>
                        <div className="flex gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingExercise(exercise);
                              setIsEditingExercise(true);
                            }}
                            className="h-8 w-8 inline-flex items-center justify-center text-zinc-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                            aria-label={`Editar ${exercise.name}`}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteExerciseTarget({ routineId: routine.id, exercise })}
                            className="h-8 w-8 inline-flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            aria-label={`Eliminar ${exercise.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!routine.exercises || routine.exercises.length === 0) && (
                      <p className="text-zinc-400 text-[11px] italic col-span-full py-3 text-center">Sin ejercicios en esta rutina.</p>
                    )}
                  </div>
                </div>
              )}
            </Card>
            );
          })
        )}
      </div>
      )}
    </div>
  );
}
