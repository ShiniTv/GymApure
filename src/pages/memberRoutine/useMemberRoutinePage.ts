import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { format, addDays } from 'date-fns';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import { clientLogger } from '../../lib/clientLogger';
import { useAuth } from '../../context/AuthContext';
import { useToastOptional } from '../../context/ToastContext';
import { useHealthProfileQuery } from '../../hooks/queries/useHealthProfileQuery';
import { useExercisesCatalogQuery } from '../../hooks/queries/useExercisesQuery';
import { useRoutinesLibraryQuery } from '../../hooks/queries/useRoutinesQuery';
import {
  fetchExerciseLoadSuggestion,
  fetchMemberRoutineContext,
  fetchMemberRoutines,
  fetchRoutineExercises,
  type ExerciseLoadSuggestion,
} from '../../hooks/queries/useMemberRoutineQuery';
import { hasCriticalHealthFlags } from '../../lib/healthConditions';
import {
  buildRoutineExercisePayload,
  buildRoutineExerciseUpdatePayload,
  defaultRoutineExerciseForm,
} from '../../lib/routineExercisePayload';
import { deriveSetPrescription } from '../../lib/setPrescription';
import type { Exercise, Measurement, MemberUser, Routine, Subscription } from './types';
import type { AssignFormState } from './MemberRoutineModals';
import type { MeasurementFormValue } from './MemberMeasurementsPanel';
import type { CoachingTab } from './utils';
import { parseCoachingTab } from './utils';
import type { CoachingInsight } from './MemberRoutineHeader';

export function useMemberRoutinePage(id: string | undefined) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToastOptional();

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [member, setMember] = useState<MemberUser | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingMeasurement, setIsAddingMeasurement] = useState(false);
  const [measurementForm, setMeasurementForm] = useState<MeasurementFormValue>({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    body_fat_percentage: '',
    waist: '',
    arm: '',
    leg: '',
  });

  const [isAssigning, setIsAssigning] = useState(false);
  const [assignForm, setAssignForm] = useState<AssignFormState>({
    user_id: '',
    routine_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    scheduled_weekdays: [],
  });

  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<number | null>(null);
  const [routineForm, setRoutineForm] = useState({ name: '', difficulty: 'Beginner' });
  const [unassignTarget, setUnassignTarget] = useState<Routine | null>(null);
  const [deleteExerciseTarget, setDeleteExerciseTarget] = useState<{
    routineId: number;
    exercise: Exercise;
  } | null>(null);
  const [substitutionTarget, setSubstitutionTarget] = useState<{
    routineId: number;
    exercise: Exercise;
  } | null>(null);
  const [substitutionExerciseId, setSubstitutionExerciseId] = useState('');
  const [substitutionReason, setSubstitutionReason] = useState('');
  const [substitutingExercise, setSubstitutingExercise] = useState(false);

  const [expandedRoutineId, setExpandedRoutineId] = useState<number | null>(null);
  const [isEditingExercise, setIsEditingExercise] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [loadSuggestion, setLoadSuggestion] = useState<ExerciseLoadSuggestion | null>(null);
  const [loadingLoadSuggestion, setLoadingLoadSuggestion] = useState(false);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [newExercise, setNewExercise] = useState(defaultRoutineExerciseForm);
  const [coachingTab, setCoachingTab] = useState<CoachingTab>(
    () => parseCoachingTab(searchParams.get('tab')) ?? 'rutinas'
  );

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [moreSectionsOpen, setMoreSectionsOpen] = useState(false);
  const [routineMenuId, setRoutineMenuId] = useState<number | null>(null);
  const moreMenuAnchorRef = useRef<HTMLButtonElement>(null);
  const moreSectionsAnchorRef = useRef<HTMLButtonElement>(null);
  const routineMenuAnchorRef = useRef<HTMLButtonElement>(null);
  const [addExerciseError, setAddExerciseError] = useState<string | null>(null);
  const [editExerciseError, setEditExerciseError] = useState<string | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState(5);
  const [savingWeeklyGoal, setSavingWeeklyGoal] = useState(false);
  const [weeklyGoalSaved, setWeeklyGoalSaved] = useState(false);
  const weeklyGoalSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: exercisesCatalog = [], isPending: catalogLoading } = useExercisesCatalogQuery(true);
  const { data: routinesCatalog = [] } = useRoutinesLibraryQuery(isAssigning);

  const availableExercises = useMemo(
    () =>
      exercisesCatalog.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        muscle_group: exercise.muscle_group,
      })),
    [exercisesCatalog]
  );
  const availableRoutines = useMemo(
    () =>
      routinesCatalog.map((routine) => ({
        id: routine.id,
        name: routine.name,
        difficulty: routine.difficulty,
      })),
    [routinesCatalog]
  );

  const assignedRoutineIds = useMemo(() => new Set(routines.map((r) => r.id)), [routines]);
  const memberId = id ? parseInt(id, 10) : undefined;
  const { data: healthProfile } = useHealthProfileQuery(
    memberId,
    Boolean(memberId) && (user?.role === 'trainer' || user?.role === 'admin')
  );
  const showHealthAlert = healthProfile
    ? hasCriticalHealthFlags(healthProfile.condition_flags)
    : false;

  useEffect(() => {
    const next = parseCoachingTab(searchParams.get('tab'));
    if (next === 'mediciones') {
      setCoachingTab('progreso');
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set('tab', 'progreso');
          return p;
        },
        { replace: true }
      );
      return;
    }
    if (next) setCoachingTab(next);
  }, [searchParams, setSearchParams]);

  const changeCoachingTab = (tab: CoachingTab) => {
    setCoachingTab(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === 'rutinas') next.delete('tab');
        else next.set('tab', tab);
        return next;
      },
      { replace: true }
    );
  };

  const refreshUserRoutines = () =>
    fetchMemberRoutines(Number(id)).then((data) => {
      setRoutines(data);
    });

  const refreshRoutineExercises = async (routineId: number) => {
    const exercises = await fetchRoutineExercises(routineId);
    setRoutines((prev) => prev.map((r) => (r.id === routineId ? { ...r, exercises } : r)));
  };

  useEffect(() => {
    if (!id) return;
    const userId = parseInt(id, 10);
    fetchMemberRoutineContext(userId)
      .then((data) => {
        setMember(data.member);
        setWeeklyGoal(data.member.weekly_training_goal ?? 5);
        setRoutines(data.routines);
        setSubscription(data.subscription);
        setMeasurements(data.measurements);
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

  const openAssignModal = () => {
    setAssignForm((prev) => ({
      ...prev,
      user_id: id ?? '',
      routine_id: '',
    }));
    setIsAssigning(true);
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
          scheduled_weekdays: assignForm.scheduled_weekdays,
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

  const handleCloneRoutine = async (routine: Routine) => {
    try {
      const response = await apiFetch(`/api/routines/${routine.id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const cloned = await parseJsonResponse<{ name: string }>(response);
      toast?.success(`${cloned.name} guardada en tu biblioteca`);
    } catch (err) {
      clientLogger.error('Failed to clone routine', err);
      toast?.error(err instanceof Error ? err.message : 'No se pudo duplicar la rutina');
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

  const openEditExercise = async (routineId: number, exercise: Exercise) => {
    const nextExercise = {
      ...exercise,
      set_prescription:
        exercise.set_prescription ?? deriveSetPrescription(exercise.sets, exercise.reps),
    };
    setEditingExercise(nextExercise);
    setLoadSuggestion(null);
    setIsEditingExercise(true);
    setLoadingLoadSuggestion(true);
    try {
      setLoadSuggestion(await fetchExerciseLoadSuggestion(Number(id), exercise.id, routineId));
    } catch (err) {
      clientLogger.warn('Failed to load exercise suggestion', { err });
    } finally {
      setLoadingLoadSuggestion(false);
    }
  };

  const applyLastSessionLoad = () => {
    if (!loadSuggestion?.last_session) return;
    const { weight, reps } = loadSuggestion.last_session;
    setEditingExercise((current) =>
      current
        ? {
            ...current,
            reps,
            set_prescription: deriveSetPrescription(
              current.sets,
              reps,
              current.set_prescription
            ).map((set) => ({ ...set, reps, weight_kg: weight })),
          }
        : current
    );
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

  const openSubstitution = (routineId: number, exercise: Exercise) => {
    setSubstitutionTarget({ routineId, exercise });
    setSubstitutionExerciseId('');
    setSubstitutionReason('');
  };

  const handleSubstitution = async () => {
    if (!substitutionTarget || !substitutionExerciseId || substitutionReason.trim().length < 2)
      return;
    setSubstitutingExercise(true);
    try {
      const response = await apiFetch(
        `/api/routines/${substitutionTarget.routineId}/exercises/${substitutionTarget.exercise.routine_exercise_id}/substitute`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exercise_id: Number(substitutionExerciseId),
            reason: substitutionReason,
          }),
        }
      );
      const result = await parseJsonResponse<{ exercise: { name: string } }>(response);
      await refreshRoutineExercises(substitutionTarget.routineId);
      setSubstitutionTarget(null);
      toast?.success(`Sustituido por ${result.exercise.name}`);
    } catch (err) {
      clientLogger.error('Failed to substitute routine exercise', err);
      toast?.error(err instanceof Error ? err.message : 'No se pudo sustituir el ejercicio');
    } finally {
      setSubstitutingExercise(false);
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

  const latestMeasurement = measurements[0] ?? null;
  const hasHealthNotes = Boolean(
    healthProfile &&
    (healthProfile.condition_labels.length > 0 ||
      healthProfile.conditions_notes ||
      healthProfile.limitations_notes ||
      healthProfile.allergies_notes ||
      healthProfile.medications_notes)
  );

  const coachingInsight: CoachingInsight | null = (() => {
    if (showHealthAlert) {
      return {
        tone: 'danger',
        message: 'Hay alertas de salud: revisa limitaciones antes de entrenar.',
        actionLabel: 'Ver salud',
        run: () => {
          changeCoachingTab('perfil');
        },
      };
    }
    if (routines.length === 0 && coachingTab === 'rutinas') {
      return {
        tone: 'warning',
        message: 'Sin rutina asignada.',
        actionLabel: 'Asignar',
        run: () => {
          openAssignModal();
        },
      };
    }
    if (subscription && subscription.days_remaining <= 7) {
      return {
        tone: 'warning',
        message: `Membresía vence en ${subscription.days_remaining} día${subscription.days_remaining !== 1 ? 's' : ''}.`,
        actionLabel: 'Mensaje',
        run: () => {
          void navigate(`/messages?member=${id}`);
        },
      };
    }
    return null;
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

  return {
    user,
    loading,
    member,
    routines,
    subscription,
    measurements,
    healthProfile,
    showHealthAlert,
    hasHealthNotes,
    latestMeasurement,
    coachingTab,
    changeCoachingTab,
    coachingInsight,
    headerPrimary,
    navigate,
    moreMenuOpen,
    setMoreMenuOpen,
    moreSectionsOpen,
    setMoreSectionsOpen,
    moreMenuAnchorRef,
    moreSectionsAnchorRef,
    openAssignModal,
    openCreateRoutine: () => {
      setIsCreating(true);
      setRoutineForm({ name: '', difficulty: 'Beginner' });
    },
    weeklyGoal,
    setWeeklyGoalDraft: (next: number) => {
      setWeeklyGoal(next);
      setWeeklyGoalSaved(false);
    },
    savingWeeklyGoal,
    weeklyGoalSaved,
    handleSaveWeeklyGoal,
    isAddingMeasurement,
    setIsAddingMeasurement,
    measurementForm,
    setMeasurementForm,
    handleAddMeasurement,
    expandedRoutineId,
    routineMenuId,
    routineMenuAnchorRef,
    setRoutineMenuId: (routineId: number | null, anchor?: HTMLButtonElement) => {
      if (anchor) routineMenuAnchorRef.current = anchor;
      setRoutineMenuId(routineId);
    },
    toggleExpandRoutine,
    handleInlineUpdate,
    openEditExercise,
    openSubstitution,
    setDeleteExerciseTarget,
    openEditModal,
    handleCloneRoutine,
    setUnassignTarget,
    openAddExercise: () => {
      setAddExerciseError(null);
      setIsAddingExercise(true);
    },
    modals: {
      assignedRoutineIds,
      isCreating,
      isEditing,
      routineForm,
      setRoutineForm,
      onCloseRoutineForm: () => {
        setIsCreating(false);
        setIsEditing(false);
      },
      handleCreateRoutine,
      handleUpdateRoutine,
      substitutionTarget,
      availableExercises,
      catalogLoading,
      substitutionExerciseId,
      setSubstitutionExerciseId,
      substitutionReason,
      setSubstitutionReason,
      substitutingExercise,
      onCloseSubstitution: () => setSubstitutionTarget(null),
      handleSubstitution,
      isAddingExercise,
      newExercise,
      setNewExercise,
      addExerciseError,
      onCloseAddExercise: () => setIsAddingExercise(false),
      handleAddExercise,
      isEditingExercise,
      editingExercise,
      setEditingExercise,
      loadSuggestion,
      loadingLoadSuggestion,
      editExerciseError,
      onCloseEditExercise: () => {
        setIsEditingExercise(false);
        setLoadSuggestion(null);
      },
      applyLastSessionLoad,
      handleUpdateExercise,
      isAssigning,
      assignForm,
      setAssignForm,
      availableRoutines,
      onCloseAssign: () => setIsAssigning(false),
      handleAssignRoutine,
      unassignTarget,
      onCloseUnassign: () => setUnassignTarget(null),
      handleUnassignRoutine,
      deleteExerciseTarget,
      onCloseDeleteExercise: () => setDeleteExerciseTarget(null),
      confirmDeleteExercise,
    },
  };
}
