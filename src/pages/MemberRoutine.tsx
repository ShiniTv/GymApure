import React, { useState, useEffect, useRef, useMemo } from 'react';
import { apiFetch, parseJsonResponse, parseJsonOptional } from '../lib/api';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  Calendar,
  Plus,
  Edit,
  Trash2,
  UserMinus,
  History,
  MessageSquare,
  UtensilsCrossed,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Trophy,
  Minus,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { dateLocale as es } from '../lib/dateLocale';
import { formatDateOnly } from '../lib/dates';
import { useAuth } from '../context/AuthContext';
import { useToastOptional } from '../context/ToastContext';
import {
  Button,
  Card,
  Modal,
  PageHeader,
  Label,
  Input,
  Badge,
  Spinner,
  EmptyState,
  DifficultySelect,
  Breadcrumbs,
  Avatar,
  SegmentedControl,
  PageState,
  AnchoredMenu,
} from '../components/ui';
import { ExercisePicker } from '../components/exercise/ExercisePicker';
import { AssignRoutineForm } from '../components/routines/AssignRoutineForm';
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
import { buildExerciseSummary } from '../lib/routineDisplay';
import { useHealthProfileQuery } from '../hooks/queries/useHealthProfileQuery';
import { hasCriticalHealthFlags } from '../lib/healthConditions';
import { ACTIVITY_LEVELS } from '../lib/metabolicRate';

function heightCmNumber(height: number | null | undefined): number | null {
  if (height == null || Number.isNaN(height)) return null;
  if (height > 0 && height < 3) return Math.round(height * 1000) / 10;
  return height;
}

function formatMemberGoal(goal: string | null | undefined): string | null {
  if (!goal) return null;
  const map: Record<string, string> = {
    'Lose Weight': 'Bajar de peso',
    'Gain Muscle': 'Ganar músculo',
    'Gain Weight': 'Subir de peso',
    Maintain: 'Mantener',
    'General Fitness': 'Condición general',
  };
  return map[goal] ?? goal;
}

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
  const toast = useToastOptional();
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
  const [assignForm, setAssignForm] = useState({
    user_id: '',
    routine_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
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
  const moreMenuAnchorRef = useRef<HTMLButtonElement>(null);
  const routineMenuAnchorRef = useRef<HTMLButtonElement>(null);
  const [addExerciseError, setAddExerciseError] = useState<string | null>(null);
  const [editExerciseError, setEditExerciseError] = useState<string | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState(5);
  const [savingWeeklyGoal, setSavingWeeklyGoal] = useState(false);
  const [weeklyGoalSaved, setWeeklyGoalSaved] = useState(false);
  const weeklyGoalSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const assignedRoutineIds = useMemo(() => new Set(routines.map((r) => r.id)), [routines]);
  const memberId = id ? parseInt(id, 10) : undefined;
  const { data: healthProfile } = useHealthProfileQuery(
    memberId,
    Boolean(memberId) && (user?.role === 'trainer' || user?.role === 'admin')
  );
  const showHealthAlert = healthProfile
    ? hasCriticalHealthFlags(healthProfile.condition_flags)
    : false;

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
        setWeeklyGoal(userData.weekly_training_goal ?? 5);
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
    return () => {
      if (weeklyGoalSavedTimerRef.current) clearTimeout(weeklyGoalSavedTimerRef.current);
    };
  }, []);

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
    apiFetch('/api/routines?all=1')
      .then((res) => parseJsonResponse<RoutineOption[]>(res))
      .then((data) => {
        setAvailableRoutines(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        clientLogger.error('Failed to fetch routines catalog', err);
      });
  };

  const openAssignModal = () => {
    setAssignForm((prev) => ({
      ...prev,
      user_id: id ?? '',
      routine_id: '',
    }));
    setIsAssigning(true);
    apiFetchAvailableRoutines();
  };

  const handleSaveWeeklyGoal = async () => {
    if (!id) return;
    const goal = Math.min(7, Math.max(1, weeklyGoal));
    setSavingWeeklyGoal(true);
    try {
      const res = await apiFetch(`/api/users/${id}/weekly-training-goal`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekly_training_goal: goal }),
      });
      const data = await parseJsonResponse<{ weekly_training_goal: number }>(res);
      setWeeklyGoal(data.weekly_training_goal);
      setMember((prev) =>
        prev ? { ...prev, weekly_training_goal: data.weekly_training_goal } : prev
      );
      setWeeklyGoalSaved(true);
      if (weeklyGoalSavedTimerRef.current) clearTimeout(weeklyGoalSavedTimerRef.current);
      weeklyGoalSavedTimerRef.current = setTimeout(() => {
        setWeeklyGoalSaved(false);
      }, 2000);
    } catch (err) {
      clientLogger.error('Failed to update weekly training goal', err);
      toast?.error(err instanceof Error ? err.message : 'No se pudo guardar la meta semanal');
    } finally {
      setSavingWeeklyGoal(false);
    }
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
    if (!assignForm.routine_id || !user || !id) return;

    try {
      const res = await apiFetch(`/api/users/${id}/routines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routine_id: parseInt(assignForm.routine_id),
          assigned_by: user.id,
          start_date: assignForm.start_date,
          end_date: assignForm.end_date,
        }),
      });

      const data = await parseJsonResponse<{ updated?: boolean }>(res);
      setIsAssigning(false);
      setAssignForm((prev) => ({ ...prev, routine_id: '' }));
      await refreshUserRoutines();
      toast?.success(data.updated ? 'Fechas actualizadas' : 'Rutina asignada');
    } catch (err) {
      clientLogger.error('Failed to assign routine to member', err);
      toast?.error(err instanceof Error ? err.message : 'No se pudo asignar la rutina');
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
      toast?.success('Rutina creada y asignada');
    } catch (err) {
      clientLogger.error('Failed to create routine for member', err);
      toast?.error(err instanceof Error ? err.message : 'No se pudo crear la rutina');
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
    apiFetch('/api/exercises?all=1')
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

    setExpandedRoutineId(routineId);
    try {
      await refreshRoutineExercises(routineId);
    } catch (err) {
      clientLogger.error('Failed to fetch routine exercises', err);
      toast?.error(
        err instanceof Error ? err.message : 'No se pudieron cargar los ejercicios de la rutina'
      );
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

  const menuRoutine =
    routineMenuId != null ? routines.find((routine) => routine.id === routineMenuId) : null;
  const heightCm = heightCmNumber(member.height);
  const latestMeasurement = measurements[0] ?? null;
  const hasHealthNotes = Boolean(
    healthProfile &&
    (healthProfile.condition_labels.length > 0 ||
      healthProfile.conditions_notes ||
      healthProfile.limitations_notes ||
      healthProfile.allergies_notes ||
      healthProfile.medications_notes)
  );

  const coachingInsight = (() => {
    if (showHealthAlert) {
      return {
        tone: 'danger' as const,
        message: 'Hay alertas de salud: revisa limitaciones antes de entrenar.',
        actionLabel: 'Ver salud',
        run: () => {
          setCoachingTab('perfil');
        },
      };
    }
    if (routines.length === 0) {
      return {
        tone: 'warning' as const,
        message: 'Sin rutina asignada.',
        actionLabel: 'Asignar',
        run: () => {
          openAssignModal();
        },
      };
    }
    if (subscription && subscription.days_remaining <= 7) {
      return {
        tone: 'warning' as const,
        message: `Membresía vence en ${subscription.days_remaining} día${subscription.days_remaining !== 1 ? 's' : ''}.`,
        actionLabel: 'Mensaje',
        run: () => {
          void navigate(`/messages?member=${id}`);
        },
      };
    }
    if (measurements.length === 0) {
      return {
        tone: 'neutral' as const,
        message: 'Aún no hay mediciones de progreso.',
        actionLabel: 'Registrar',
        run: () => {
          setCoachingTab('mediciones');
          setIsAddingMeasurement(true);
        },
      };
    }
    const weightBit =
      latestMeasurement?.weight != null ? `último peso ${latestMeasurement.weight} kg` : null;
    return {
      tone: 'ok' as const,
      message: [
        `${routines.length} rutina${routines.length !== 1 ? 's' : ''}`,
        weightBit,
        formatMemberGoal(member.goal),
      ]
        .filter(Boolean)
        .join(' · '),
      actionLabel: null as string | null,
      run: null as (() => void) | null,
    };
  })();

  const headerPrimary = showHealthAlert
    ? {
        label: 'Ver salud',
        run: () => {
          setCoachingTab('perfil');
        },
        solid: true,
      }
    : routines.length === 0
      ? {
          label: 'Asignar',
          run: () => {
            openAssignModal();
          },
          solid: true,
        }
      : {
          label: 'Mensaje',
          run: () => {
            void navigate(`/messages?member=${id}`);
          },
          solid: false,
        };

  return (
    <div className="page-stack-tight">
      <Link
        to="/members"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-zinc-500 hover:text-zinc-800 sm:hidden dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ChevronRight className="h-3.5 w-3.5 rotate-180" aria-hidden />
        Miembros
      </Link>
      <Breadcrumbs
        className="mb-0 hidden sm:block"
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
          <span className="flex min-w-0 items-center gap-2.5">
            <Avatar name={member.full_name} size="sm" className="shrink-0" />
            <span className="truncate">{member.full_name}</span>
          </span>
        }
        subtitle={
          coachingTab === 'rutinas'
            ? `${routines.length} rutina${routines.length !== 1 ? 's' : ''}`
            : subscription
              ? `${subscription.membership_name} · ${subscription.days_remaining} días`
              : undefined
        }
        action={
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant={headerPrimary.solid ? 'primary' : 'ghost'}
              size="sm"
              className={headerPrimary.solid ? 'h-9 gap-1.5 px-3 text-xs' : 'h-9 w-9 px-0'}
              onClick={headerPrimary.run}
              aria-label={headerPrimary.label}
              title={headerPrimary.label}
            >
              {headerPrimary.label === 'Mensaje' ? (
                <MessageSquare className="h-4 w-4" />
              ) : headerPrimary.label === 'Asignar' ? (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>{headerPrimary.label}</span>
                </>
              ) : (
                <span>{headerPrimary.label}</span>
              )}
            </Button>
            <Button
              ref={moreMenuAnchorRef}
              variant="ghost"
              size="sm"
              className="h-9 w-9 px-0"
              onClick={() => setMoreMenuOpen((open) => !open)}
              aria-expanded={moreMenuOpen}
              aria-haspopup="menu"
              aria-label="Más acciones"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <AnchoredMenu
        open={moreMenuOpen}
        onClose={() => setMoreMenuOpen(false)}
        anchorRef={moreMenuAnchorRef}
        className="min-w-[11rem]"
      >
        {headerPrimary.label !== 'Mensaje' && (
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={() => {
              setMoreMenuOpen(false);
              void navigate(`/messages?member=${id}`);
            }}
          >
            <MessageSquare className="h-4 w-4" />
            Mensaje
          </button>
        )}
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={() => {
            setMoreMenuOpen(false);
            void navigate(`/members/${id}/history`);
          }}
        >
          <History className="h-4 w-4" />
          Historial
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={() => {
            setMoreMenuOpen(false);
            void navigate(`/members/${id}/records`);
          }}
        >
          <Trophy className="h-4 w-4" />
          Marcas
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={() => {
            setMoreMenuOpen(false);
            void navigate(`/members/${id}/nutrition`);
          }}
        >
          <UtensilsCrossed className="h-4 w-4" />
          Nutrición
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={() => {
            setMoreMenuOpen(false);
            setIsCreating(true);
            setRoutineForm({ name: '', difficulty: 'Beginner' });
          }}
        >
          <Plus className="h-4 w-4" />
          Crear rutina
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={() => {
            setMoreMenuOpen(false);
            openAssignModal();
          }}
        >
          <Plus className="h-4 w-4" />
          Asignar rutina
        </button>
      </AnchoredMenu>

      <Card
        padding="sm"
        rounded="xl"
        className="sticky top-2 z-10 hidden border-zinc-200/70 bg-white/95 backdrop-blur-sm sm:flex sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800/80 dark:bg-zinc-900/95"
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
              {formatMemberGoal(member.goal)}
            </Badge>
          )}
          {showHealthAlert && (
            <Badge variant="danger" className="px-1.5 py-0 text-[9px]">
              Salud
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
        layout="scroll"
        value={coachingTab}
        onChange={setCoachingTab}
        options={[
          { value: 'rutinas', label: 'Rutinas' },
          { value: 'perfil', label: 'Perfil' },
          { value: 'mediciones', label: 'Mediciones' },
        ]}
        className="w-full"
      />

      <div
        className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[12px] ${
          coachingInsight.tone === 'danger'
            ? 'bg-red-500/10 text-red-700 dark:text-red-300'
            : coachingInsight.tone === 'warning'
              ? 'bg-amber-500/10 text-amber-800 dark:text-amber-200'
              : coachingInsight.tone === 'ok'
                ? 'bg-zinc-100/80 text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-400'
                : 'bg-zinc-100/80 text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300'
        }`}
        role="status"
      >
        <p className="min-w-0 flex-1 leading-snug">{coachingInsight.message}</p>
        {coachingInsight.actionLabel && coachingInsight.run && (
          <button
            type="button"
            onClick={coachingInsight.run}
            className="shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-semibold underline-offset-2 hover:underline"
          >
            {coachingInsight.actionLabel}
          </button>
        )}
      </div>

      {coachingTab === 'perfil' && (
        <div className="space-y-2.5">
          <div className="rounded-xl border border-zinc-200/70 px-3 py-2.5 dark:border-zinc-800/80">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              <div>
                <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  Altura
                </p>
                <p className="mt-0.5 text-sm font-semibold text-zinc-900 tabular-nums dark:text-white">
                  {heightCm != null ? `${heightCm} cm` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  {latestMeasurement?.weight != null ? 'Peso actual' : 'Peso inicial'}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-zinc-900 tabular-nums dark:text-white">
                  {latestMeasurement?.weight != null
                    ? `${latestMeasurement.weight} kg`
                    : member.initial_weight != null
                      ? `${member.initial_weight} kg`
                      : '—'}
                </p>
                {latestMeasurement?.weight != null && (
                  <button
                    type="button"
                    className="text-brand mt-0.5 text-[10px] font-medium hover:underline"
                    onClick={() => {
                      setCoachingTab('mediciones');
                    }}
                  >
                    Ver mediciones
                  </button>
                )}
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  Objetivo
                </p>
                <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-white">
                  {formatMemberGoal(member.goal) ?? '—'}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  Meta semanal
                </p>
                {user?.role === 'admin' || user?.role === 'trainer' ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700">
                      <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-900 disabled:opacity-40 sm:h-8 sm:w-8 dark:hover:text-white"
                        aria-label="Bajar meta"
                        disabled={savingWeeklyGoal || weeklyGoal <= 1}
                        onClick={() => {
                          setWeeklyGoal((g) => Math.max(1, g - 1));
                          setWeeklyGoalSaved(false);
                        }}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-[2.5rem] text-center text-sm font-semibold text-zinc-900 tabular-nums dark:text-white">
                        {weeklyGoal}
                        <span className="ml-0.5 text-[11px] font-medium text-zinc-500">d</span>
                      </span>
                      <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-900 disabled:opacity-40 sm:h-8 sm:w-8 dark:hover:text-white"
                        aria-label="Subir meta"
                        disabled={savingWeeklyGoal || weeklyGoal >= 7}
                        onClick={() => {
                          setWeeklyGoal((g) => Math.min(7, g + 1));
                          setWeeklyGoalSaved(false);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {weeklyGoal !== (member.weekly_training_goal ?? 5) ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs"
                        disabled={savingWeeklyGoal}
                        onClick={() => void handleSaveWeeklyGoal()}
                      >
                        {savingWeeklyGoal ? '…' : 'Guardar'}
                      </Button>
                    ) : weeklyGoalSaved ? (
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        Guardado
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-0.5 text-sm font-semibold text-zinc-900 tabular-nums dark:text-white">
                    {member.weekly_training_goal ?? 5} días
                  </p>
                )}
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-zinc-100 pt-2 text-[11px] dark:border-zinc-800">
              {subscription ? (
                <>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-500">
                    {subscription.membership_name}
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-500">·</span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {subscription.days_remaining} días
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-500">·</span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Vence {format(new Date(subscription.end_date), 'dd MMM yyyy', { locale: es })}
                  </span>
                </>
              ) : (
                <span className="text-zinc-400 dark:text-zinc-500">Sin membresía activa</span>
              )}
            </div>
          </div>

          <details className="group rounded-xl border border-zinc-200/70 dark:border-zinc-800/80">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 items-center gap-2">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Salud y limitaciones
                </span>
                {showHealthAlert && (
                  <Badge variant="danger" className="px-1.5 py-0 text-[9px]">
                    Revisar
                  </Badge>
                )}
                {!showHealthAlert && !hasHealthNotes && (
                  <span className="text-[10px] font-medium text-zinc-400">Sin datos</span>
                )}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-zinc-100 px-3 pt-2 pb-2.5 dark:border-zinc-800">
              {healthProfile &&
              (healthProfile.condition_labels.length > 0 ||
                healthProfile.conditions_notes ||
                healthProfile.limitations_notes ||
                healthProfile.allergies_notes ||
                healthProfile.medications_notes) ? (
                <div className="space-y-2 text-xs sm:text-sm">
                  {healthProfile.condition_labels.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {healthProfile.condition_labels.map((flag) => (
                        <Badge key={flag.id} variant="warning" className="text-[10px]">
                          {flag.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {healthProfile.conditions_notes && (
                    <p>
                      <span className="text-zinc-500 dark:text-zinc-400">Patologías:</span>{' '}
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {healthProfile.conditions_notes}
                      </span>
                    </p>
                  )}
                  {healthProfile.limitations_notes && (
                    <p>
                      <span className="text-zinc-500 dark:text-zinc-400">Limitaciones:</span>{' '}
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {healthProfile.limitations_notes}
                      </span>
                    </p>
                  )}
                  {healthProfile.allergies_notes && (
                    <p>
                      <span className="text-zinc-500 dark:text-zinc-400">Alergias:</span>{' '}
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {healthProfile.allergies_notes}
                      </span>
                    </p>
                  )}
                  {healthProfile.medications_notes && (
                    <p>
                      <span className="text-zinc-500 dark:text-zinc-400">Medicación:</span>{' '}
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {healthProfile.medications_notes}
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    El miembro aún no ha completado su perfil de salud.
                  </p>
                  <button
                    type="button"
                    className="text-brand text-[11px] font-semibold hover:underline"
                    onClick={() => {
                      void navigate(`/messages?member=${id}`);
                    }}
                  >
                    Pedir por mensaje
                  </button>
                </div>
              )}
            </div>
          </details>

          <details className="group rounded-xl border border-zinc-200/70 dark:border-zinc-800/80">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Metabolismo estimado
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-zinc-100 px-3 pt-2 pb-2.5 dark:border-zinc-800">
              {healthProfile?.bmr_kcal != null && healthProfile.tdee_kcal != null ? (
                <div className="space-y-1.5 text-xs sm:text-sm">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <p>
                      <span className="text-zinc-500 dark:text-zinc-400">TMB</span>{' '}
                      <span className="font-semibold text-zinc-900 dark:text-white">
                        {healthProfile.bmr_kcal} kcal
                      </span>
                    </p>
                    <p>
                      <span className="text-zinc-500 dark:text-zinc-400">GET</span>{' '}
                      <span className="font-semibold text-emerald-600 dark:text-emerald-500">
                        {healthProfile.tdee_kcal} kcal
                      </span>
                    </p>
                  </div>
                  {healthProfile.activity_level && (
                    <p className="text-zinc-500 dark:text-zinc-400">
                      {ACTIVITY_LEVELS.find((l) => l.id === healthProfile.activity_level)?.label ??
                        healthProfile.activity_level}
                    </p>
                  )}
                  {healthProfile.metabolic_computed_at && (
                    <p className="text-[10px] text-zinc-400">
                      Calculado{' '}
                      {format(new Date(healthProfile.metabolic_computed_at), 'dd MMM yyyy', {
                        locale: es,
                      })}
                      {healthProfile.weight_used_kg != null &&
                        ` · ${healthProfile.weight_used_kg} kg`}
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-400">
                    Estimación basada en datos declarados por el miembro.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  Sin cálculo de TMB/GET registrado.
                </p>
              )}
            </div>
          </details>
        </div>
      )}

      {coachingTab === 'mediciones' && (
        <div className="space-y-2">
          {(user?.role === 'admin' || user?.role === 'trainer') && measurements.length > 0 && (
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-1 px-2.5 text-xs"
                onClick={() => {
                  setIsAddingMeasurement(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Registrar
              </Button>
            </div>
          )}
          {measurements.length > 0 ? (
            <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800/80">
              {measurements.map((m, i) => {
                const prev = measurements[i + 1];
                const weightDelta =
                  m.weight != null && prev?.weight != null
                    ? Math.round((m.weight - prev.weight) * 10) / 10
                    : null;
                const extras = [
                  m.waist != null ? `cintura ${m.waist}` : null,
                  m.arm != null ? `brazo ${m.arm}` : null,
                  m.leg != null ? `pierna ${m.leg}` : null,
                ].filter(Boolean);
                return (
                  <div
                    key={m.id}
                    className={`flex items-start justify-between gap-2 px-3 py-2.5 text-xs sm:text-sm ${
                      i < measurements.length - 1
                        ? 'border-b border-zinc-100 dark:border-zinc-800'
                        : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-600 dark:text-zinc-300">
                        {format(new Date(m.date), 'dd MMM yyyy', { locale: es })}
                      </p>
                      {extras.length > 0 && (
                        <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">
                          {extras.join(' · ')} cm
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right tabular-nums">
                      {m.weight != null ? (
                        <p className="font-semibold text-zinc-900 dark:text-white">
                          {m.weight} kg
                          {weightDelta != null && weightDelta !== 0 && (
                            <span
                              className={
                                weightDelta < 0
                                  ? 'ml-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400'
                                  : 'ml-1 text-[10px] font-medium text-amber-600 dark:text-amber-400'
                              }
                            >
                              {weightDelta > 0 ? '+' : ''}
                              {weightDelta}
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="text-zinc-400">—</p>
                      )}
                      {m.body_fat_percentage != null && (
                        <p className="text-[10px] text-zinc-400">{m.body_fat_percentage}% grasa</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 px-3 py-6 text-center dark:border-zinc-700">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Sin mediciones
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Registra la primera para ver el progreso en Perfil.
              </p>
              {(user?.role === 'admin' || user?.role === 'trainer') && (
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 h-9 px-3 text-xs"
                  onClick={() => {
                    setIsAddingMeasurement(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Registrar
                </Button>
              )}
            </div>
          )}
        </div>
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
            <div>
              <Label>Pierna (cm)</Label>
              <Input
                type="number"
                step="0.1"
                value={measurementForm.leg}
                onChange={(e) => {
                  setMeasurementForm({ ...measurementForm, leg: e.target.value });
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
        initialFocus="dialog"
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
        initialFocus="dialog"
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
        initialFocus="dialog"
        title="Asignar rutina"
      >
        <AssignRoutineForm
          value={assignForm}
          onChange={setAssignForm}
          onSubmit={handleAssignRoutine}
          routines={availableRoutines}
          memberIdFixed={id}
          allowReassign
          assignedRoutineIds={assignedRoutineIds}
        />
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
                      openAssignModal();
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
              const exerciseCount = routine.exercise_count ?? routine.exercises?.length ?? 0;
              const exerciseSummary = buildExerciseSummary({
                count: exerciseCount,
                preview: routine.exercise_preview,
                loadedExercises: routine.exercises,
              });
              const formatDate = (value: string | null | undefined) => {
                if (!value) return '—';
                try {
                  return formatDateOnly(value, 'dd/MM/yy', { locale: es });
                } catch {
                  return '—';
                }
              };

              return (
                <Card
                  key={routine.id}
                  padding="sm"
                  rounded="xl"
                  className={`touch-manipulation border-zinc-200/70 dark:border-zinc-800/80 ${
                    isExpanded ? 'ring-brand/20 ring-2' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => void toggleExpandRoutine(routine.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          void toggleExpandRoutine(routine.id);
                        }
                      }}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
                      aria-expanded={isExpanded}
                    >
                      <div className="bg-brand/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                        <Dumbbell className="text-brand h-3.5 w-3.5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm leading-tight font-semibold text-zinc-900 dark:text-white">
                            {routine.name}
                          </h3>
                          <Badge variant="default" className="shrink-0 px-1.5 py-0 text-[9px]">
                            {formatDifficulty(routine.difficulty)}
                          </Badge>
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3 shrink-0" />
                            {formatDate(routine.start_date)} – {formatDate(routine.end_date)}
                          </span>
                          <span className="text-zinc-400 dark:text-zinc-500">·</span>
                          <span className="font-medium text-zinc-600 dark:text-zinc-300">
                            {exerciseSummary.label}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void toggleExpandRoutine(routine.id);
                        }}
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors sm:h-8 sm:w-8 sm:rounded-lg ${
                          isExpanded
                            ? 'border-zinc-900 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                            : 'hover:border-brand hover:text-brand border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400'
                        }`}
                        aria-label={isExpanded ? 'Cerrar ejercicios' : 'Ver ejercicios'}
                        aria-expanded={isExpanded}
                        title={isExpanded ? 'Cerrar ejercicios' : 'Ejercicios'}
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (routineMenuId === routine.id) {
                            setRoutineMenuId(null);
                            return;
                          }
                          routineMenuAnchorRef.current = e.currentTarget;
                          setRoutineMenuId(routine.id);
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 sm:hidden dark:text-zinc-400 dark:hover:bg-zinc-800"
                        aria-label="Más acciones"
                        aria-expanded={routineMenuId === routine.id}
                        aria-haspopup="menu"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      <div className="hidden items-center gap-0.5 sm:flex">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(routine);
                          }}
                          className="hover:text-brand hover:bg-brand/10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors dark:text-zinc-300"
                          aria-label={`Editar ${routine.name}`}
                          title="Editar"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUnassignTarget(routine);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-500 dark:text-zinc-300"
                          aria-label={`Quitar ${routine.name}`}
                          title="Quitar"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void navigate(`/members/${id}/history?routine=${routine.id}`);
                          }}
                          className="hover:text-brand hover:bg-brand/10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors dark:text-zinc-300"
                          aria-label={`Historial de ${routine.name}`}
                          title="Historial"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-2.5 space-y-2 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
                      {exerciseSummary.preview && (
                        <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                          {exerciseSummary.preview}
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          Ejercicios
                        </h4>
                        <Button
                          type="button"
                          size="sm"
                          className="h-10 px-3 text-xs sm:h-8 sm:px-2.5"
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
          {routines.length > 0 && routines.length <= 2 && (
            <button
              type="button"
              onClick={() => openAssignModal()}
              className="text-brand hover:bg-brand/5 dark:hover:bg-brand/10 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-200 py-2.5 text-xs font-semibold transition-colors dark:border-zinc-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Asignar otra rutina
            </button>
          )}
          <AnchoredMenu
            open={menuRoutine != null}
            onClose={() => setRoutineMenuId(null)}
            anchorRef={routineMenuAnchorRef}
            className="min-w-[10rem]"
          >
            {menuRoutine && (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  onClick={() => {
                    setRoutineMenuId(null);
                    openEditModal(menuRoutine);
                  }}
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-500/10"
                  onClick={() => {
                    setRoutineMenuId(null);
                    setUnassignTarget(menuRoutine);
                  }}
                >
                  <UserMinus className="h-4 w-4" />
                  Quitar
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  onClick={() => {
                    setRoutineMenuId(null);
                    void navigate(`/members/${id}/history?routine=${menuRoutine.id}`);
                  }}
                >
                  <History className="h-4 w-4" />
                  Historial
                </button>
              </>
            )}
          </AnchoredMenu>
        </div>
      )}
    </div>
  );
}
