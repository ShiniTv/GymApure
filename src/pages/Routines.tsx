import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import {
  useRoutinesLibraryQuery,
  useMemberRoutinesQuery,
  useMemberOptionsQuery,
  useRoutineAssignmentsQuery,
  useInvalidateAssignmentData,
} from '../hooks/queries/useRoutinesQuery';
import { useTrainersQuery } from '../hooks/queries/useTrainersQuery';
import { useExercisesCatalogQuery } from '../hooks/queries/useExercisesQuery';
import { useNavigate, useSearchParams } from 'react-router';
import { Dumbbell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMemberStatsOptional } from '../context/MemberStatsContext';
import { useToastOptional } from '../context/ToastContext';
import {
  PageHeader,
  SegmentedControl,
  BackToDashboardLink,
  Card,
  EmptyState,
  Button,
  CalendarViewSkeleton,
} from '../components/ui';
import { clientLogger } from '../lib/clientLogger';
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isWithinInterval,
  isAfter,
  isBefore,
  startOfDay,
} from 'date-fns';
import { parseDateOnly } from '../lib/dates';
import type {
  Routine,
  RoutineExercise,
  ExerciseOption,
  CalendarAssignment,
  RoutinesView,
} from './routines/types';
import { RoutineModals } from './routines/RoutineModals';
import { RoutinesLibraryView } from './routines/RoutinesLibraryView';
import { RoutinesAssignmentsView } from './routines/RoutinesAssignmentsView';
import { RoutinesCalendarView } from './routines/RoutinesCalendarView';
import { dateLocale as es } from '../lib/dateLocale';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshContainer } from '../components/PullToRefresh';
import {
  buildRoutineExercisePayload,
  buildRoutineExerciseUpdatePayload,
  defaultRoutineExerciseForm,
} from '../lib/routineExercisePayload';
import { deriveSetPrescription, parseSetPrescriptionFromApi } from '../lib/setPrescription';
import { MemberTemplatesSection } from '../components/member/MemberTemplatesSection';
import { MemberTodayRoutinePicker } from '../components/member/MemberTodayRoutinePicker';
import { MemberSubstituteExerciseModal } from '../components/member/MemberSubstituteExerciseModal';
import { useSubstituteRoutineExerciseMutation } from '../hooks/queries/useMemberAgencyQuery';

type MemberRoutineRow = Routine & { start_date?: string | null; end_date?: string | null };

function getMemberRoutineStatus(
  startDate?: string | null,
  endDate?: string | null
): 'upcoming' | 'ending' | 'active' | null {
  const today = startOfDay(new Date());
  if (startDate) {
    const start = startOfDay(parseDateOnly(startDate));
    if (isAfter(start, today)) return 'upcoming';
  }
  if (endDate) {
    const end = startOfDay(parseDateOnly(endDate));
    if (isBefore(end, today)) return null;
    if (!isAfter(end, addDays(today, 7))) return 'ending';
  }
  return 'active';
}

export default function Routines() {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewFromUrl = searchParams.get('view');
  const showMemberTemplates = viewFromUrl === 'templates';
  const initialView: RoutinesView =
    viewFromUrl === 'assignments' || viewFromUrl === 'calendar' ? viewFromUrl : 'library';

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [view, setView] = useState<RoutinesView>(initialView);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoutine, setNewRoutine] = useState({
    name: '',
    difficulty: 'Beginner',
    clone_from_id: '',
  });
  const [cloningRoutineId, setCloningRoutineId] = useState<number | null>(null);
  const [isAssigningFromCalendar, setIsAssigningFromCalendar] = useState(false);
  const [assignSingleDay, setAssignSingleDay] = useState(false);
  const [assignForm, setAssignForm] = useState({
    user_id: '',
    routine_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
  });
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [expandedRoutineId, setExpandedRoutineId] = useState<number | null>(null);
  const [isEditingExercise, setIsEditingExercise] = useState(false);
  const [editingExercise, setEditingExercise] = useState<RoutineExercise | null>(null);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [pendingAddExerciseId, setPendingAddExerciseId] = useState<number | null>(null);
  const [newExercise, setNewExercise] = useState(defaultRoutineExerciseForm);
  const [deleteRoutineTarget, setDeleteRoutineTarget] = useState<Routine | null>(null);
  const [deleteRoutineError, setDeleteRoutineError] = useState<string | null>(null);
  const [deletingRoutine, setDeletingRoutine] = useState(false);
  const [deleteExerciseTarget, setDeleteExerciseTarget] = useState<{
    routineId: number;
    exercise: RoutineExercise;
  } | null>(null);
  const [deletingExercise, setDeletingExercise] = useState(false);
  const [addExerciseError, setAddExerciseError] = useState<string | null>(null);
  const [editExerciseError, setEditExerciseError] = useState<string | null>(null);
  const [substituteTarget, setSubstituteTarget] = useState<{
    routineId: number;
    exercise: RoutineExercise;
  } | null>(null);
  const [substituteExerciseId, setSubstituteExerciseId] = useState('');
  const [substituteReason, setSubstituteReason] = useState('');

  const substituteMutation = useSubstituteRoutineExerciseMutation();

  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToastOptional();
  const memberStatsCtx = useMemberStatsOptional();
  const invalidateAssignmentData = useInvalidateAssignmentData();
  const isMember = user?.role === 'member';
  const isStaffRoutines = user?.role === 'admin' || user?.role === 'trainer';
  const {
    data: libraryRoutines,
    isPending: libraryLoading,
    isError: libraryError,
  } = useRoutinesLibraryQuery(!isMember && !!user);
  const {
    data: memberRoutines,
    isPending: memberLoading,
    isError: memberError,
    refetch: refetchMember,
  } = useMemberRoutinesQuery(user?.id, isMember && !!user);
  const {
    data: members = [],
    isPending: membersLoading,
    isError: membersError,
    error: membersQueryError,
  } = useMemberOptionsQuery(!isMember && !!user);
  const { data: exercisesCatalog = [], isPending: exercisesCatalogLoading } =
    useExercisesCatalogQuery(!!user);
  const { data: assignments = [], isPending: loadingAssignments } =
    useRoutineAssignmentsQuery(isStaffRoutines);
  const { data: allTrainers = [] } = useTrainersQuery({}, isStaffRoutines);
  const loadingRoutines = isMember ? memberLoading : libraryLoading;
  const routinesLoadError = isMember ? memberError : libraryError;
  const availableExercises = exercisesCatalog as ExerciseOption[];

  const onRefreshMemberRoutines = useCallback(async () => {
    if (isMember) await refetchMember();
  }, [isMember, refetchMember]);

  const {
    pullDistance: memberPullDistance,
    isRefreshing: memberRefreshing,
    handlers: memberPtrHandlers,
  } = usePullToRefresh({
    onRefresh: onRefreshMemberRoutines,
    threshold: 80,
  });

  const selectedMember = useMemo(
    () => members.find((m) => String(m.id) === assignForm.user_id),
    [members, assignForm.user_id]
  );

  const selectedMemberShift = selectedMember?.training_shift ?? null;

  const availableTrainersForShift = useMemo(() => {
    if (!selectedMemberShift) return allTrainers;
    return allTrainers.filter((t) => t.shift === selectedMemberShift);
  }, [allTrainers, selectedMemberShift]);

  const filteredRoutinesForAssign = useMemo(() => {
    if (!selectedMemberShift) return routines;
    const trainerIds = new Set(availableTrainersForShift.map((t) => t.id));
    return routines.filter((r) => r.trainer_id != null && trainerIds.has(r.trainer_id));
  }, [routines, selectedMemberShift, availableTrainersForShift]);

  usePageTitle(isMember ? 'Rutinas' : 'Gestión de rutinas');

  const memberRoutineHighlights = useMemo(() => {
    if (!isMember) return { upcoming: [] as MemberRoutineRow[], ending: [] as MemberRoutineRow[] };
    const rows = (memberRoutines ?? []) as MemberRoutineRow[];
    const upcoming = rows.filter(
      (r) => getMemberRoutineStatus(r.start_date, r.end_date) === 'upcoming'
    );
    const ending = rows.filter(
      (r) => getMemberRoutineStatus(r.start_date, r.end_date) === 'ending'
    );
    return { upcoming, ending };
  }, [isMember, memberRoutines]);

  useEffect(() => {
    const next = isMember ? (memberRoutines ?? []) : (libraryRoutines ?? []);
    setRoutines((prev) => {
      const prevById = new Map(prev.map((r) => [r.id, r]));
      return next.map((r) => {
        const existing = prevById.get(r.id);
        if (existing?.exercises !== undefined) {
          return { ...r, exercises: existing.exercises };
        }
        return r;
      });
    });
  }, [isMember, memberRoutines, libraryRoutines]);

  const changeView = (next: RoutinesView) => {
    setView(next);
    if (next === 'library') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ view: next }, { replace: true });
    }
  };

  useEffect(() => {
    const param = searchParams.get('view');
    if (param === 'assignments' || param === 'calendar') {
      setView(param);
    } else if (!param || param === 'library') {
      setView('library');
    }
    if (searchParams.get('assign') === '1') {
      setIsAssigningFromCalendar(true);
      const memberId = searchParams.get('member');
      if (memberId && /^\d+$/.test(memberId)) {
        setAssignForm((prev) => ({ ...prev, user_id: memberId }));
      }
    }
  }, [searchParams]);

  // Deep link: /routines?routine=&addExercise= — abre el modal en la rutina elegida
  useEffect(() => {
    if (isMember || libraryLoading) return;
    const addExercise = searchParams.get('addExercise');
    if (!addExercise || !/^\d+$/.test(addExercise)) return;

    const exerciseId = Number(addExercise);
    const routineParam = searchParams.get('routine');
    const routineId = routineParam && /^\d+$/.test(routineParam) ? Number(routineParam) : null;

    const next = new URLSearchParams(searchParams);
    next.delete('addExercise');
    next.delete('routine');
    if (!next.get('view')) next.set('view', 'library');
    setSearchParams(next, { replace: true });

    setView('library');
    setNewExercise((prev) => ({ ...prev, exercise_id: String(exerciseId) }));
    setPendingAddExerciseId(exerciseId);

    if (routineId == null) {
      toast?.success('Elige una rutina y pulsa Añadir ejercicio');
      return;
    }

    const exists = (libraryRoutines ?? []).some((r) => r.id === routineId);
    if (!exists) {
      toast?.error('No se encontró esa rutina');
      return;
    }

    void (async () => {
      setExpandedRoutineId(routineId);
      setAddExerciseError(null);
      try {
        await refreshRoutineExercises(routineId);
        setPendingAddExerciseId(null);
        setIsAddingExercise(true);
        toast?.success('Revisa series y reps, luego confirma para añadir');
      } catch (err) {
        clientLogger.error('Failed to open add-exercise from library', err);
        toast?.error(err instanceof Error ? err.message : 'No se pudo abrir la rutina');
      }
    })();
  }, [searchParams, libraryLoading, isMember, libraryRoutines]);

  const refreshRoutineExercises = async (routineId: number) => {
    const res = await apiFetch(`/api/routines/${routineId}`);
    const data = await parseJsonResponse<{ exercises: RoutineExercise[] }>(res);
    const exercises = (Array.isArray(data.exercises) ? data.exercises : []).map((exercise) => ({
      ...exercise,
      set_prescription:
        parseSetPrescriptionFromApi(exercise.set_prescription) ??
        deriveSetPrescription(exercise.sets, exercise.reps),
    }));
    setRoutines((prev) =>
      prev.map((r) =>
        r.id === routineId ? { ...r, exercises, exercise_count: exercises.length } : r
      )
    );
  };

  const openAssignModal = useCallback(() => {
    const start = format(new Date(), 'yyyy-MM-dd');
    const end = format(addDays(new Date(), 30), 'yyyy-MM-dd');
    setAssignForm((prev) => ({
      ...prev,
      start_date: start,
      end_date: end,
    }));
    setAssignSingleDay(false);
    setIsAssigningFromCalendar(true);
  }, []);

  const refreshRoutines = () => invalidateAssignmentData();

  const handleInlineUpdate = async (
    routineId: number,
    exercise: RoutineExercise,
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
        prev.map((r) =>
          r.id === routineId
            ? {
                ...r,
                exercises: r.exercises?.map((e) =>
                  e.routine_exercise_id === exercise.routine_exercise_id ? updatedExercise : e
                ),
              }
            : r
        )
      );
    } catch (err) {
      clientLogger.error('Failed to inline update exercise', err);
    }
  };

  const handleCreateRoutine = async () => {
    if (!user) return;
    const cloneFromId = newRoutine.clone_from_id ? parseInt(newRoutine.clone_from_id, 10) : NaN;
    const isClone = Number.isSafeInteger(cloneFromId) && cloneFromId > 0;
    if (!isClone && !newRoutine.name.trim()) return;

    try {
      if (isClone) {
        const body: { name?: string } = {};
        if (newRoutine.name.trim()) body.name = newRoutine.name.trim();
        const res = await apiFetch(`/api/routines/${cloneFromId}/clone`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const cloned = await parseJsonResponse<{ id: number; name: string }>(res);
        toast?.success(`${cloned.name} creada desde plantilla`);
        setExpandedRoutineId(cloned.id);
      } else {
        const res = await apiFetch('/api/routines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newRoutine.name.trim(),
            difficulty: newRoutine.difficulty,
            trainer_id: user.id,
          }),
        });
        const created = await parseJsonResponse<{ id?: number }>(res);
        toast?.success('Rutina creada');
        if (created.id != null) setExpandedRoutineId(created.id);
      }
      setIsCreating(false);
      setNewRoutine({ name: '', difficulty: 'Beginner', clone_from_id: '' });
      refreshRoutines();
    } catch (err) {
      clientLogger.error('Failed to create routine', err);
      toast?.error(err instanceof Error ? err.message : 'No se pudo crear la rutina');
    }
  };

  const handleCloneRoutine = async (routine: Routine) => {
    setCloningRoutineId(routine.id);
    try {
      const res = await apiFetch(`/api/routines/${routine.id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const cloned = await parseJsonResponse<{ id: number; name: string }>(res);
      toast?.success(`${cloned.name} en tu biblioteca`);
      setExpandedRoutineId(cloned.id);
      refreshRoutines();
    } catch (err) {
      clientLogger.error('Failed to clone routine', err);
      toast?.error(err instanceof Error ? err.message : 'No se pudo duplicar la rutina');
    } finally {
      setCloningRoutineId(null);
    }
  };

  const handleUpdateRoutine = async () => {
    if (!editingRoutine?.name) return;
    try {
      const res = await apiFetch(`/api/routines/${editingRoutine.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingRoutine.name, difficulty: editingRoutine.difficulty }),
      });
      await parseJsonResponse(res);
      setEditingRoutine(null);
      refreshRoutines();
    } catch (err) {
      clientLogger.error('Failed to update routine', err);
    }
  };

  const confirmDeleteRoutine = async () => {
    if (!deleteRoutineTarget) return;
    setDeletingRoutine(true);
    setDeleteRoutineError(null);
    try {
      const res = await apiFetch(`/api/routines/${deleteRoutineTarget.id}`, { method: 'DELETE' });
      await parseJsonResponse(res);
      setDeleteRoutineTarget(null);
      if (expandedRoutineId === deleteRoutineTarget.id) setExpandedRoutineId(null);
      refreshRoutines();
    } catch (err) {
      setDeleteRoutineError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeletingRoutine(false);
    }
  };

  const confirmDeleteExercise = async () => {
    if (!deleteExerciseTarget) return;
    setDeletingExercise(true);
    try {
      const { routineId, exercise } = deleteExerciseTarget;
      const res = await apiFetch(
        `/api/routines/${routineId}/exercises/${exercise.routine_exercise_id}`,
        { method: 'DELETE' }
      );
      await parseJsonResponse(res);
      setDeleteExerciseTarget(null);
      await refreshRoutineExercises(routineId);
    } catch (err) {
      clientLogger.error('Failed to delete routine exercise', err);
    } finally {
      setDeletingExercise(false);
    }
  };

  const handleRoutineCardClick = (routineId: number) => {
    if (expandedRoutineId === routineId) return;
    if (user?.role === 'member') {
      void toggleExpandRoutine(routineId);
      return;
    }
    if (user?.role === 'trainer') {
      void toggleExpandRoutine(routineId);
    }
  };

  const handleStartWorkout = (routineId: number) => {
    navigate(`/workout/${routineId}`);
  };

  const handleMemberSubstitute = async () => {
    if (!substituteTarget || !substituteExerciseId || substituteReason.trim().length < 2) return;
    try {
      await substituteMutation.mutateAsync({
        routineId: substituteTarget.routineId,
        routineExerciseId: substituteTarget.exercise.routine_exercise_id,
        exercise_id: Number(substituteExerciseId),
        reason: substituteReason.trim(),
      });
      await refreshRoutineExercises(substituteTarget.routineId);
      setSubstituteTarget(null);
      setSubstituteExerciseId('');
      setSubstituteReason('');
      toast?.success('Ejercicio sustituido');
    } catch (err) {
      toast?.error(err instanceof Error ? err.message : 'No se pudo sustituir el ejercicio');
    }
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

  const handleAddWorkoutExercise = async () => {
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

  const handleQuickAssign = async () => {
    if (!assignForm.user_id || !assignForm.routine_id || !user) return;
    try {
      const res = await apiFetch(`/api/users/${assignForm.user_id}/routines`, {
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
      setIsAssigningFromCalendar(false);
      setAssignForm((prev) => ({ ...prev, user_id: '', routine_id: '' }));
      invalidateAssignmentData();
      toast?.success(data.updated ? 'Fechas actualizadas' : 'Rutina asignada');
    } catch (err) {
      clientLogger.error('Failed to assign routine', err);
      toast?.error(err instanceof Error ? err.message : 'No se pudo asignar la rutina');
    }
  };

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const assignmentsByDay = useMemo(() => {
    if (!assignments.length) return {};
    const map: Record<string, CalendarAssignment[]> = {};
    assignments.forEach((member) => {
      if (!member.routines) return;
      member.routines.forEach((routine) => {
        if (!routine.start_date || !routine.end_date) return;
        try {
          const start = startOfDay(parseDateOnly(routine.start_date));
          const end = startOfDay(parseDateOnly(routine.end_date));
          if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return;
          calendarDays.forEach((day) => {
            const dayStart = startOfDay(day);
            if (isWithinInterval(dayStart, { start, end })) {
              const dateStr = format(day, 'yyyy-MM-dd');
              if (!map[dateStr]) map[dateStr] = [];
              map[dateStr].push({
                member_id: member.id,
                member_name: member.full_name,
                routine_name: routine.routine_name,
                difficulty: routine.difficulty,
              });
            }
          });
        } catch (err) {
          clientLogger.error('Error processing routine dates', err);
        }
      });
    });
    return map;
  }, [assignments, calendarDays]);

  useEffect(() => {
    if (view === 'calendar' && selectedDay === null) {
      setSelectedDay(new Date());
    }
  }, [view, selectedDay]);

  const routinesPage = (
    <div className="page-stack-tight mx-auto w-full max-w-7xl">
      {isMember && routinesLoadError && (
        <EmptyState
          icon={Dumbbell}
          title="Error al cargar rutinas"
          description="No pudimos obtener tus rutinas. Comprueba tu conexión e inténtalo de nuevo."
          action={
            <Button size="sm" onClick={() => void refetchMember()}>
              Reintentar
            </Button>
          }
        />
      )}

      {!(isMember && routinesLoadError) && (
        <>
          <PageHeader
            compact
            showTitleOnMobile
            title={
              isMember ? (
                <>
                  Mis <span className="text-brand">rutinas</span>
                </>
              ) : (
                <>
                  Gestión de <span className="text-brand">rutinas</span>
                </>
              )
            }
            subtitle={
              user?.role === 'member'
                ? showMemberTemplates
                  ? 'Plantillas para empezar por tu cuenta'
                  : 'Tus rutinas y elección del día'
                : view === 'assignments'
                  ? (() => {
                      const active = assignments.filter((m) => m.routines && m.routines.length > 0);
                      const total = active.reduce((sum, m) => sum + (m.routines?.length ?? 0), 0);
                      if (loadingAssignments) return 'Cargando asignaciones…';
                      return `${active.length} miembro${active.length !== 1 ? 's' : ''} · ${total} rutina${total !== 1 ? 's' : ''} activa${total !== 1 ? 's' : ''}`;
                    })()
                  : view === 'calendar'
                    ? 'Semana y asignaciones por día'
                    : `${routines.length} plantilla${routines.length !== 1 ? 's' : ''} · listas para asignar`
            }
            action={<BackToDashboardLink />}
          />

          {isMember &&
            (memberRoutineHighlights.upcoming.length > 0 ||
              memberRoutineHighlights.ending.length > 0) && (
              <Card padding="sm" rounded="xl" className="space-y-3">
                <h3 className="text-text text-sm font-bold">Asignaciones</h3>
                {memberRoutineHighlights.upcoming.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-small text-text-muted font-semibold tracking-wide uppercase">
                      Próximas
                    </p>
                    {memberRoutineHighlights.upcoming.map((routine) => (
                      <div
                        key={routine.id}
                        className="bg-brand/5 border-brand/15 flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-text truncate text-sm font-semibold">{routine.name}</p>
                          {routine.start_date && (
                            <p className="text-small text-text-muted">
                              Inicia{' '}
                              {format(parseDateOnly(routine.start_date), 'dd MMM yyyy', {
                                locale: es,
                              })}
                            </p>
                          )}
                        </div>
                        <span className="text-small text-text-secondary shrink-0 font-medium">
                          Próxima
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {memberRoutineHighlights.ending.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-small text-text-muted font-semibold tracking-wide uppercase">
                      Por vencer
                    </p>
                    {memberRoutineHighlights.ending.map((routine) => (
                      <div
                        key={routine.id}
                        className="border-warning/20 bg-warning/5 flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-text truncate text-sm font-semibold">{routine.name}</p>
                          {routine.end_date && (
                            <p className="text-small text-text-muted">
                              Hasta{' '}
                              {format(parseDateOnly(routine.end_date), 'dd MMM yyyy', {
                                locale: es,
                              })}
                            </p>
                          )}
                        </div>
                        <span className="text-small text-text-secondary shrink-0 font-medium">
                          Por vencer
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

          {user?.role !== 'member' && (
            <SegmentedControl
              variant="compact"
              layout="wrap"
              className="w-fit max-w-full"
              value={view}
              onChange={changeView}
              options={[
                { value: 'library', label: 'Biblioteca' },
                { value: 'assignments', label: 'Asignaciones' },
                { value: 'calendar', label: 'Calendario' },
              ]}
            />
          )}

          <RoutineModals
            isAssigningFromCalendar={isAssigningFromCalendar}
            setIsAssigningFromCalendar={(open) => {
              setIsAssigningFromCalendar(open);
              if (!open) setAssignSingleDay(false);
            }}
            assignSingleDay={assignSingleDay}
            assignForm={assignForm}
            setAssignForm={setAssignForm}
            members={members}
            membersLoading={membersLoading}
            membersError={membersError ? membersQueryError : undefined}
            onCreateMember={() => {
              setIsAssigningFromCalendar(false);
              navigate('/members');
            }}
            routines={routines}
            handleQuickAssign={handleQuickAssign}
            isCreating={isCreating}
            setIsCreating={setIsCreating}
            newRoutine={newRoutine}
            setNewRoutine={setNewRoutine}
            handleCreateRoutine={handleCreateRoutine}
            libraryRoutines={routines.map((r) => ({
              id: r.id,
              name: r.name,
              difficulty: r.difficulty,
            }))}
            editingRoutine={editingRoutine}
            setEditingRoutine={setEditingRoutine}
            handleUpdateRoutine={handleUpdateRoutine}
            isAddingExercise={isAddingExercise}
            setIsAddingExercise={setIsAddingExercise}
            availableExercises={availableExercises}
            catalogLoading={exercisesCatalogLoading}
            newExercise={newExercise}
            setNewExercise={setNewExercise}
            handleAddWorkoutExercise={handleAddWorkoutExercise}
            addExerciseError={addExerciseError}
            editExerciseError={editExerciseError}
            isEditingExercise={isEditingExercise}
            setIsEditingExercise={setIsEditingExercise}
            editingExercise={editingExercise}
            setEditingExercise={setEditingExercise}
            handleUpdateExercise={handleUpdateExercise}
            deleteRoutineTarget={deleteRoutineTarget}
            setDeleteRoutineTarget={setDeleteRoutineTarget}
            deleteRoutineError={deleteRoutineError}
            deletingRoutine={deletingRoutine}
            confirmDeleteRoutine={confirmDeleteRoutine}
            deleteExerciseTarget={deleteExerciseTarget}
            setDeleteExerciseTarget={setDeleteExerciseTarget}
            deletingExercise={deletingExercise}
            confirmDeleteExercise={confirmDeleteExercise}
            filteredRoutines={filteredRoutinesForAssign}
            selectedMemberShift={selectedMemberShift}
            availableTrainers={availableTrainersForShift.map((t) => ({
              id: t.id,
              full_name: t.full_name,
            }))}
          />

          <MemberSubstituteExerciseModal
            open={!!substituteTarget}
            exerciseName={substituteTarget?.exercise.name ?? ''}
            muscleGroup={substituteTarget?.exercise.muscle_group ?? ''}
            exercises={availableExercises}
            selectedExerciseId={substituteExerciseId}
            reason={substituteReason}
            saving={substituteMutation.isPending}
            onClose={() => setSubstituteTarget(null)}
            onExerciseChange={setSubstituteExerciseId}
            onReasonChange={setSubstituteReason}
            onConfirm={() => void handleMemberSubstitute()}
          />

          {isMember ? (
            <SegmentedControl
              variant="compact"
              layout="wrap"
              className="w-fit max-w-full"
              value={showMemberTemplates ? 'templates' : 'assigned'}
              onChange={(next) => {
                if (next === 'templates') setSearchParams({ view: 'templates' });
                else setSearchParams({});
              }}
              options={[
                { value: 'assigned', label: 'Mis rutinas' },
                { value: 'templates', label: 'Plantillas' },
              ]}
            />
          ) : null}

          {isMember &&
          !showMemberTemplates &&
          (memberStatsCtx?.stats?.assignedRoutines?.length ?? 0) > 1 ? (
            <MemberTodayRoutinePicker
              routines={memberStatsCtx?.stats?.assignedRoutines ?? []}
              selectedId={
                memberStatsCtx?.stats?.todayRoutineId ?? memberStatsCtx?.stats?.primaryRoutine?.id
              }
            />
          ) : null}

          {view === 'library' ? (
            showMemberTemplates && isMember ? (
              <MemberTemplatesSection />
            ) : (
              <RoutinesLibraryView
                loadingRoutines={loadingRoutines}
                routines={routines}
                userRole={user?.role}
                expandedRoutineId={expandedRoutineId}
                onRoutineCardClick={handleRoutineCardClick}
                onToggleExpandRoutine={toggleExpandRoutine}
                onEditRoutine={setEditingRoutine}
                onDeleteRoutine={(routine) => {
                  setDeleteRoutineError(null);
                  setDeleteRoutineTarget(routine);
                }}
                onCreateRoutine={() => {
                  setNewRoutine({ name: '', difficulty: 'Beginner', clone_from_id: '' });
                  setIsCreating(true);
                }}
                onCreateFromTemplate={() => {
                  setNewRoutine({
                    name: '',
                    difficulty: 'Beginner',
                    clone_from_id: routines[0] ? String(routines[0].id) : '',
                  });
                  setIsCreating(true);
                }}
                onCloneRoutine={(routine) => {
                  void handleCloneRoutine(routine);
                }}
                cloningRoutineId={cloningRoutineId}
                onAddExercise={(routineId) => {
                  setExpandedRoutineId(routineId);
                  setAddExerciseError(null);
                  if (pendingAddExerciseId != null) {
                    setNewExercise((prev) => ({
                      ...prev,
                      exercise_id: String(pendingAddExerciseId),
                    }));
                    setPendingAddExerciseId(null);
                  }
                  setIsAddingExercise(true);
                }}
                onInlineUpdate={handleInlineUpdate}
                onEditExercise={(exercise) => {
                  setEditExerciseError(null);
                  setEditingExercise(exercise);
                  setIsEditingExercise(true);
                }}
                onDeleteExercise={(routineId, exercise) => {
                  setDeleteExerciseTarget({ routineId, exercise });
                }}
                onStartWorkout={handleStartWorkout}
                onSubstituteExercise={
                  isMember
                    ? (routineId, exercise) => {
                        setSubstituteTarget({ routineId, exercise });
                        setSubstituteExerciseId('');
                        setSubstituteReason('');
                      }
                    : undefined
                }
                completedRoutineIdsToday={
                  isMember ? (memberStatsCtx?.stats?.completedRoutineIdsToday ?? []) : undefined
                }
                activeRoutineIds={
                  isMember
                    ? (memberStatsCtx?.stats?.activeSessions?.map((s) => s.routine_id) ?? [])
                    : undefined
                }
              />
            )
          ) : view === 'calendar' ? (
            loadingAssignments ? (
              <CalendarViewSkeleton />
            ) : (
              <RoutinesCalendarView
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                selectedDay={selectedDay}
                setSelectedDay={setSelectedDay}
                calendarDays={calendarDays}
                assignmentsByDay={assignmentsByDay}
                paletteRoutines={(libraryRoutines ?? []).map((r) => ({ id: r.id, name: r.name }))}
                paletteMembers={members.map((m) => ({ id: m.id, full_name: m.full_name }))}
                onAssignDirect={() => {
                  const day = selectedDay ?? new Date();
                  const dateStr = format(day, 'yyyy-MM-dd');
                  setAssignForm((prev) => ({
                    ...prev,
                    start_date: dateStr,
                    end_date: dateStr,
                  }));
                  setAssignSingleDay(true);
                  setIsAssigningFromCalendar(true);
                }}
                onAssignOnDay={(dateStr) => {
                  setAssignForm((prev) => ({
                    ...prev,
                    start_date: dateStr,
                    end_date: dateStr,
                  }));
                  setAssignSingleDay(true);
                  setIsAssigningFromCalendar(true);
                }}
                onDropAssign={(dateStr, payload) => {
                  setAssignForm((prev) => ({
                    ...prev,
                    start_date: dateStr,
                    end_date: dateStr,
                    ...(payload.kind === 'routine'
                      ? { routine_id: String(payload.id) }
                      : { user_id: String(payload.id) }),
                  }));
                  setAssignSingleDay(true);
                  setIsAssigningFromCalendar(true);
                }}
                onNavigateToMemberRoutines={(memberId) => navigate(`/members/${memberId}/routines`)}
              />
            )
          ) : (
            <RoutinesAssignmentsView
              loadingAssignments={loadingAssignments}
              assignments={assignments}
              onChangeView={changeView}
              onAssign={openAssignModal}
              onNavigateToMemberRoutines={(memberId) => navigate(`/members/${memberId}/routines`)}
            />
          )}
        </>
      )}
    </div>
  );

  if (isMember) {
    return (
      <PullToRefreshContainer pullDistance={memberPullDistance} isRefreshing={memberRefreshing}>
        <div {...memberPtrHandlers}>{routinesPage}</div>
      </PullToRefreshContainer>
    );
  }

  return routinesPage;
}
