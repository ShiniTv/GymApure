import React, { useState, useEffect, useRef } from 'react';
import { apiFetch, parseJsonResponse, parseJsonOptional } from '../lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  Calendar,
  Plus,
  Edit,
  Trash2,
  UserMinus,
  Scale,
  History,
  MessageSquare,
  UtensilsCrossed,
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { dateLocale as es } from '../lib/dateLocale';
import { useAuth } from '../context/AuthContext';
import {
  Button,
  Card,
  Modal,
  PageHeader,
  Label,
  Input,
  Select,
  Badge,
  Spinner,
  EmptyState,
  DifficultySelect,
  Breadcrumbs,
  Avatar,
  SegmentedControl,
  PageState,
} from '../components/ui';
import { ExercisePicker } from '../components/exercise/ExercisePicker';
import { clientLogger } from '../lib/clientLogger';
import { formatDifficulty } from '../lib/utils';
import { parseNonNegativeInt } from '../lib/parseFormNumber';
import {
  buildRoutineExercisePayload,
  buildRoutineExerciseUpdatePayload,
  defaultRoutineExerciseForm,
} from '../lib/routineExercisePayload';
import { RoutineExercisePrescriptionFields } from '../components/exercise/RoutineExercisePrescriptionFields';
import {
  deriveSetPrescription,
  formatSetPrescriptionSummary,
  parseSetPrescriptionFromApi,
} from '../lib/setPrescription';

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
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // Create/Edit Routine State
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<number | null>(null);
  const [routineForm, setRoutineForm] = useState({ name: '', difficulty: 'Beginner' });
  const [unassignTarget, setUnassignTarget] = useState<Routine | null>(null);
  const [deleteExerciseTarget, setDeleteExerciseTarget] = useState<{
    routineId: number;
    exercise: Exercise;
  } | null>(null);

  // Exercise Management State
  const [expandedRoutineId, setExpandedRoutineId] = useState<number | null>(null);
  const [isEditingExercise, setIsEditingExercise] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>([]);
  const [newExercise, setNewExercise] = useState(defaultRoutineExerciseForm);
  const [coachingTab, setCoachingTab] = useState<'rutinas' | 'perfil' | 'mediciones'>('rutinas');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [routineMenuId, setRoutineMenuId] = useState<number | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const routineMenuRef = useRef<HTMLDivElement>(null);
  const [addExerciseError, setAddExerciseError] = useState<string | null>(null);
  const [editExerciseError, setEditExerciseError] = useState<string | null>(null);

  const refreshUserRoutines = () =>
    apiFetch(`/api/users/${id}/routines`)
      .then((res) => parseJsonResponse<Routine[]>(res))
      .then((data) => {
        setRoutines(Array.isArray(data) ? data : []);
      });

  const refreshRoutineExercises = async (routineId: number) => {
    const res = await apiFetch(`/api/routines/${routineId}`);
    const data = await parseJsonResponse<{ exercises: Exercise[] }>(res);
    const exercises = (Array.isArray(data.exercises) ? data.exercises : []).map((exercise) => ({
      ...exercise,
      set_prescription:
        parseSetPrescriptionFromApi(exercise.set_prescription) ??
        deriveSetPrescription(exercise.sets, exercise.reps),
    }));
    setRoutines((prev) => prev.map((r) => (r.id === routineId ? { ...r, exercises } : r)));
  };

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiFetch(`/api/users/${id}`).then((res) => parseJsonResponse<User>(res)),
      apiFetch(`/api/users/${id}/routines`).then((res) => parseJsonResponse<Routine[]>(res)),
      apiFetch(`/api/memberships/user/${id}`).then((res) => parseJsonOptional<Subscription>(res)),
      apiFetch(`/api/users/${id}/measurements`).then((res) =>
        parseJsonResponse<Measurement[]>(res)
      ),
    ])
      .then(([userData, routinesData, subData, measurementsData]) => {
        setMember(userData);
        setRoutines(Array.isArray(routinesData) ? routinesData : []);
        setSubscription(subData?.membership_name ? subData : null);
        setMeasurements(Array.isArray(measurementsData) ? measurementsData : []);
      })
      .catch((err) => {
        clientLogger.error('Failed to load member routine context', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!moreMenuOpen && routineMenuId == null) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (moreMenuOpen && moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setMoreMenuOpen(false);
      }
      if (
        routineMenuId != null &&
        routineMenuRef.current &&
        !routineMenuRef.current.contains(target)
      ) {
        setRoutineMenuId(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [moreMenuOpen, routineMenuId]);

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
      .then((data) => {
        setAvailableRoutines(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        clientLogger.error('Failed to fetch routines catalog', err);
      });
  };

  const handleInlineUpdate = async (
    routineId: number,
    exercise: Exercise,
    field: 'sets' | 'reps',
    value: number
  ) => {
    if (value === exercise[field]) return;

    try {
      const updatedExercise = { ...exercise, [field]: value };
      const res = await apiFetch(
        `/api/routines/${routineId}/exercises/${exercise.routine_exercise_id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sets: updatedExercise.sets,
            reps: updatedExercise.reps,
            rest_seconds: updatedExercise.rest_seconds,
            weight_suggestion: updatedExercise.weight_suggestion,
          }),
        }
      );

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
          end_date: assignDates.end_date,
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
      .then((data) => {
        setAvailableExercises(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        clientLogger.error('Failed to fetch exercise catalog', err);
      });
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
    setEditExerciseError(null);

    try {
      const res = await apiFetch(
        `/api/routines/${expandedRoutineId}/exercises/${editingExercise.routine_exercise_id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildRoutineExerciseUpdatePayload(editingExercise)),
        }
      );

      await parseJsonResponse(res);
      setIsEditingExercise(false);
      setEditingExercise(null);
      await refreshRoutineExercises(expandedRoutineId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar el ejercicio';
      setEditExerciseError(message);
      clientLogger.error('Failed to update routine exercise', err);
    }
  };

  const confirmDeleteExercise = async () => {
    if (!deleteExerciseTarget) return;
    const { routineId, exercise } = deleteExerciseTarget;
    try {
      const res = await apiFetch(
        `/api/routines/${routineId}/exercises/${exercise.routine_exercise_id}`,
        {
          method: 'DELETE',
        }
      );
      await parseJsonResponse(res);
      setDeleteExerciseTarget(null);
      await refreshRoutineExercises(routineId);
    } catch (err) {
      clientLogger.error('Failed to delete routine exercise', err);
    }
  };

  const handleAddExercise = async () => {
    if (!newExercise.exercise_id || !expandedRoutineId) return;
    setAddExerciseError(null);

    try {
      const res = await apiFetch(`/api/routines/${expandedRoutineId}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRoutineExercisePayload(newExercise)),
      });

      await parseJsonResponse(res);
      setIsAddingExercise(false);
      setNewExercise(defaultRoutineExerciseForm());
      await refreshRoutineExercises(expandedRoutineId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo añadir el ejercicio';
      setAddExerciseError(message);
      clientLogger.error('Failed to add exercise to routine', err);
    }
  };

  if (loading) {
    return (
      <PageState>
        <Spinner />
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Cargando miembro…</p>
      </PageState>
    );
  }
  if (!member)
    return <div className="p-6 text-zinc-500 dark:text-white">Miembro no encontrado</div>;

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
        showTitleOnMobile
        title={
          <>
            Rutinas de <span className="text-brand">{member.full_name}</span>
          </>
        }
        action={
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              className="h-9 gap-1.5 px-2.5 text-xs"
              onClick={() => navigate(`/messages?member=${id}`)}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mensaje</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="hidden h-9 gap-1.5 px-2.5 text-xs sm:inline-flex"
              onClick={() => navigate(`/members/${id}/history`)}
            >
              <History className="h-3.5 w-3.5" />
              Historial
            </Button>
            <div className="relative" ref={moreMenuRef}>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1 px-2.5 text-xs"
                onClick={() => setMoreMenuOpen((open) => !open)}
                aria-expanded={moreMenuOpen}
                aria-haspopup="menu"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Más</span>
              </Button>
              {moreMenuOpen && (
                <div
                  role="menu"
                  className="absolute top-full right-0 z-20 mt-1 min-w-[11rem] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50 sm:hidden dark:text-zinc-200 dark:hover:bg-zinc-800"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      navigate(`/members/${id}/history`);
                    }}
                  >
                    <History className="h-3.5 w-3.5" />
                    Historial
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      navigate(`/members/${id}/nutrition`);
                    }}
                  >
                    <UtensilsCrossed className="h-3.5 w-3.5" />
                    Nutrición
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setIsCreating(true);
                      setRoutineForm({ name: '', difficulty: 'Beginner' });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Crear rutina
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setIsAssigning(true);
                      apiFetchAvailableRoutines();
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Asignar rutina
                  </button>
                </div>
              )}
            </div>
          </div>
        }
      />

      <Card
        padding="sm"
        rounded="xl"
        className="sticky top-2 z-10 hidden bg-white/95 backdrop-blur-sm sm:flex sm:flex-row sm:items-center sm:justify-between dark:bg-zinc-900/95"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={member.full_name} size="sm" className="shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
              {member.full_name}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-zinc-500 sm:text-xs dark:text-zinc-400">
              {subscription
                ? `${subscription.membership_name} · ${subscription.days_remaining} días`
                : 'Sin membresía activa'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {member.goal && (
            <Badge variant="warning" className="max-w-[8rem] truncate px-1.5 py-0 text-[9px]">
              {member.goal}
            </Badge>
          )}
          {routines.length > 0 && (
            <Badge variant="default" className="px-1.5 py-0 text-[9px]">
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
        className="w-full sm:w-auto [&_button]:text-xs sm:[&_button]:text-sm"
      />

      {coachingTab === 'perfil' && (
        <div className="grid grid-cols-1 gap-2.5 sm:gap-3 md:grid-cols-2">
          <Card padding="sm" rounded="xl">
            <h3 className="section-title mb-2.5">Perfil</h3>
            <div className="space-y-1.5 text-xs sm:text-sm">
              {member.height != null && (
                <p>
                  <span className="text-zinc-500 dark:text-zinc-400">Altura:</span>{' '}
                  <span className="font-bold">{member.height} cm</span>
                </p>
              )}
              {member.initial_weight != null && (
                <p>
                  <span className="text-zinc-500 dark:text-zinc-400">Peso inicial:</span>{' '}
                  <span className="font-bold">{member.initial_weight} kg</span>
                </p>
              )}
              {member.goal && (
                <p>
                  <span className="text-zinc-500 dark:text-zinc-400">Objetivo:</span>{' '}
                  <span className="font-bold">{member.goal}</span>
                </p>
              )}
              {!member.height && !member.initial_weight && !member.goal && (
                <p className="text-xs text-zinc-400 dark:text-zinc-300">
                  Sin datos de perfil registrados.
                </p>
              )}
            </div>
          </Card>

          <Card padding="sm" rounded="xl">
            <h3 className="section-title mb-2.5">Membresía</h3>
            {subscription ? (
              <div>
                <p className="text-base font-bold text-emerald-600 sm:text-lg dark:text-emerald-500">
                  {subscription.membership_name}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {subscription.days_remaining} días restantes
                </p>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-300">
                  Vence {format(new Date(subscription.end_date), 'dd MMM yyyy', { locale: es })}
                </p>
              </div>
            ) : (
              <p className="text-sm text-zinc-400 dark:text-zinc-300">Sin membresía activa</p>
            )}
          </Card>
        </div>
      )}

      {coachingTab === 'mediciones' && (
        <Card padding="sm" rounded="xl">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <h3 className="section-title flex items-center gap-1.5">
              <Scale className="text-brand h-3.5 w-3.5" />
              Mediciones
            </h3>
            {(user?.role === 'admin' || user?.role === 'trainer') && (
              <Button
                type="button"
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={() => {
                  setIsAddingMeasurement(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Registrar</span>
              </Button>
            )}
          </div>
          {measurements.length > 0 ? (
            <div className="space-y-1">
              {measurements.map((m) => (
                <div
                  key={m.id}
                  className="flex justify-between gap-2 border-b border-zinc-100 py-2 text-xs last:border-0 sm:text-sm dark:border-zinc-800"
                >
                  <span className="font-bold text-zinc-600 dark:text-zinc-300">
                    {format(new Date(m.date), 'dd MMM yyyy', { locale: es })}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {m.weight != null ? `${m.weight} kg` : '—'}
                    {m.body_fat_percentage != null ? ` · ${m.body_fat_percentage}% grasa` : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Scale}
              title="Sin mediciones"
              description="Registra la primera medición del miembro."
            />
          )}
        </Card>
      )}

      <Modal
        open={isAddingMeasurement}
        onClose={() => {
          setIsAddingMeasurement(false);
        }}
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
              onChange={(e) => {
                setMeasurementForm({ ...measurementForm, date: e.target.value });
              }}
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
                onChange={(e) => {
                  setMeasurementForm({ ...measurementForm, weight: e.target.value });
                }}
              />
            </div>
            <div>
              <Label>Grasa (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={measurementForm.body_fat_percentage}
                onChange={(e) => {
                  setMeasurementForm({ ...measurementForm, body_fat_percentage: e.target.value });
                }}
              />
            </div>
            <div>
              <Label>Cintura (cm)</Label>
              <Input
                type="number"
                step="0.1"
                value={measurementForm.waist}
                onChange={(e) => {
                  setMeasurementForm({ ...measurementForm, waist: e.target.value });
                }}
              />
            </div>
            <div>
              <Label>Brazo (cm)</Label>
              <Input
                type="number"
                step="0.1"
                value={measurementForm.arm}
                onChange={(e) => {
                  setMeasurementForm({ ...measurementForm, arm: e.target.value });
                }}
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
              onChange={(e) => {
                setRoutineForm({ ...routineForm, name: e.target.value });
              }}
              placeholder="Ej: Piernas A"
            />
          </div>
          <div>
            <Label>Dificultad</Label>
            <DifficultySelect
              value={routineForm.difficulty}
              onChange={(difficulty) => {
                setRoutineForm({ ...routineForm, difficulty });
              }}
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
        onClose={() => {
          setIsAddingExercise(false);
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
          <RoutineExercisePrescriptionFields
            formKey="add-exercise"
            value={newExercise}
            onChange={(prescription) => {
              setNewExercise({ ...newExercise, ...prescription });
            }}
          />
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
                placeholder="Ej: Pesado"
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
            Añadir Ejercicio
          </Button>
        </div>
      </Modal>

      <Modal
        open={isEditingExercise && !!editingExercise}
        onClose={() => {
          setIsEditingExercise(false);
        }}
        title={editingExercise ? `Editar ${editingExercise.name}` : 'Editar Ejercicio'}
        maxWidth="xl"
        scrollable
      >
        {editingExercise && (
          <div className="space-y-4">
            <RoutineExercisePrescriptionFields
              formKey={`edit-${editingExercise.routine_exercise_id}`}
              value={editingExercise}
              onChange={(prescription) => {
                setEditingExercise({ ...editingExercise, ...prescription });
              }}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Descanso (seg)</Label>
                <Input
                  type="number"
                  value={editingExercise.rest_seconds}
                  onChange={(e) => {
                    setEditingExercise({
                      ...editingExercise,
                      rest_seconds: parseNonNegativeInt(
                        e.target.value,
                        editingExercise.rest_seconds
                      ),
                    });
                  }}
                />
              </div>
              <div>
                <Label>Sugerencia</Label>
                <Input
                  type="text"
                  value={editingExercise.weight_suggestion}
                  onChange={(e) => {
                    setEditingExercise({ ...editingExercise, weight_suggestion: e.target.value });
                  }}
                />
              </div>
            </div>
            {editExerciseError && <p className="text-sm text-red-500">{editExerciseError}</p>}
            <Button className="w-full" onClick={handleUpdateExercise}>
              Guardar Cambios
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        open={isAssigning}
        onClose={() => {
          setIsAssigning(false);
        }}
        title="Asignar Rutina"
      >
        <div className="space-y-4">
          <div>
            <Label>Seleccionar Rutina</Label>
            <Select
              value={selectedRoutineId}
              onChange={(e) => {
                setSelectedRoutineId(e.target.value);
              }}
            >
              <option value="">Selecciona una rutina...</option>
              {availableRoutines
                .filter((ar) => !routines.some((r) => r.id === ar.id))
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({formatDifficulty(r.difficulty)})
                  </option>
                ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={assignDates.start_date}
                onChange={(e) => {
                  setAssignDates({ ...assignDates, start_date: e.target.value });
                }}
              />
            </div>
            <div>
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={assignDates.end_date}
                onChange={(e) => {
                  setAssignDates({ ...assignDates, end_date: e.target.value });
                }}
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
        onClose={() => {
          setUnassignTarget(null);
        }}
        title="Quitar rutina"
      >
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          ¿Quitar <strong>{unassignTarget?.name}</strong> de {member.full_name}?
        </p>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => {
              setUnassignTarget(null);
            }}
          >
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
        onClose={() => {
          setDeleteExerciseTarget(null);
        }}
        title="Quitar ejercicio"
      >
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          ¿Quitar <strong>{deleteExerciseTarget?.exercise.name}</strong> de esta rutina?
        </p>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => {
              setDeleteExerciseTarget(null);
            }}
          >
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
                <div className="flex flex-wrap justify-center gap-2">
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
                    <div className="bg-brand/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                      <Dumbbell className="text-brand dark:text-brand h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-sm leading-tight font-semibold text-zinc-900 dark:text-white">
                          {routine.name}
                        </h3>
                        <Badge variant="default" className="shrink-0 px-1.5 py-0 text-[9px]">
                          {formatDifficulty(routine.difficulty)}
                        </Badge>
                      </div>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-zinc-500 tabular-nums dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {formatDate(routine.start_date)} – {formatDate(routine.end_date)}
                        </span>
                        <span>
                          {routine.exercise_count ?? routine.exercises?.length ?? 0} ejerc.
                        </span>
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-8 gap-1 px-2 text-[11px]"
                          onClick={() => toggleExpandRoutine(routine.id)}
                        >
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                          <span className="hidden sm:inline">Ejercicios</span>
                        </Button>
                        <div
                          className="relative sm:hidden"
                          ref={routineMenuId === routine.id ? routineMenuRef : undefined}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() =>
                              setRoutineMenuId((current) =>
                                current === routine.id ? null : routine.id
                              )
                            }
                            aria-label="Más acciones"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          {routineMenuId === routine.id && (
                            <div className="absolute top-full right-0 z-20 mt-1 min-w-[9rem] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs"
                                onClick={() => {
                                  setRoutineMenuId(null);
                                  openEditModal(routine);
                                }}
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Editar
                              </button>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600"
                                onClick={() => {
                                  setRoutineMenuId(null);
                                  setUnassignTarget(routine);
                                }}
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                                Quitar
                              </button>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs"
                                onClick={() => {
                                  setRoutineMenuId(null);
                                  navigate(`/members/${id}/history?routine=${routine.id}`);
                                }}
                              >
                                <History className="h-3.5 w-3.5" />
                                Historial
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="hidden flex-wrap gap-1.5 sm:flex">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-[11px]"
                            onClick={() => openEditModal(routine)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-[11px] text-red-600 hover:text-red-600 dark:text-red-400"
                            onClick={() => setUnassignTarget(routine)}
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                            Quitar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-[11px]"
                            onClick={() => navigate(`/members/${id}/history?routine=${routine.id}`)}
                          >
                            <History className="h-3.5 w-3.5" />
                            Historial
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-2.5 space-y-2 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          Ejercicios
                        </h4>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 px-2.5 text-xs"
                          onClick={() => {
                            setAddExerciseError(null);
                            setIsAddingExercise(true);
                            apiFetchAvailableExercises();
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Añadir</span>
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {routine.exercises?.map((exercise) => (
                          <div
                            key={exercise.routine_exercise_id}
                            className="flex items-start justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-2.5 py-2 dark:border-zinc-700 dark:bg-zinc-800/50"
                          >
                            <div className="min-w-0">
                              <h5 className="truncate text-xs font-semibold text-zinc-900 dark:text-white">
                                {exercise.name}
                              </h5>
                              <p className="text-[10px] text-zinc-500 capitalize dark:text-zinc-400">
                                {exercise.muscle_group}
                              </p>
                              {formatSetPrescriptionSummary(exercise.set_prescription) && (
                                <p className="mt-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
                                  {formatSetPrescriptionSummary(exercise.set_prescription)}
                                </p>
                              )}
                              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                                <label className="inline-flex items-center gap-1">
                                  Sets
                                  <input
                                    type="number"
                                    className="focus:ring-brand w-9 rounded border border-zinc-200 bg-white px-1 py-0.5 text-center font-semibold text-zinc-900 focus:ring-1 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                                    defaultValue={exercise.sets}
                                    onBlur={(e) =>
                                      handleInlineUpdate(
                                        routine.id,
                                        exercise,
                                        'sets',
                                        parseInt(e.target.value)
                                      )
                                    }
                                    onKeyDown={(e) =>
                                      e.key === 'Enter' && (e.target as HTMLInputElement).blur()
                                    }
                                  />
                                </label>
                                <label className="inline-flex items-center gap-1">
                                  Reps
                                  <input
                                    type="number"
                                    className="focus:ring-brand w-9 rounded border border-zinc-200 bg-white px-1 py-0.5 text-center font-semibold text-zinc-900 focus:ring-1 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                                    defaultValue={exercise.reps}
                                    onBlur={(e) =>
                                      handleInlineUpdate(
                                        routine.id,
                                        exercise,
                                        'reps',
                                        parseInt(e.target.value)
                                      )
                                    }
                                    onKeyDown={(e) =>
                                      e.key === 'Enter' && (e.target as HTMLInputElement).blur()
                                    }
                                  />
                                </label>
                                <span>
                                  Rst{' '}
                                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                    {exercise.rest_seconds}s
                                  </span>
                                </span>
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingExercise({
                                    ...exercise,
                                    set_prescription:
                                      exercise.set_prescription ??
                                      deriveSetPrescription(exercise.sets, exercise.reps),
                                  });
                                  setIsEditingExercise(true);
                                }}
                                className="hover:text-brand hover:bg-brand/10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors dark:text-zinc-300"
                                aria-label={`Editar ${exercise.name}`}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteExerciseTarget({ routineId: routine.id, exercise });
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-500 dark:text-zinc-300"
                                aria-label={`Eliminar ${exercise.name}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {(!routine.exercises || routine.exercises.length === 0) && (
                          <p className="col-span-full py-3 text-center text-[11px] text-zinc-400 italic dark:text-zinc-300">
                            Sin ejercicios en esta rutina.
                          </p>
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
