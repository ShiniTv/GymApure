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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMemberStatsOptional } from '../context/MemberStatsContext';
import { useToastOptional } from '../context/ToastContext';
import {
  PageHeader,
  SegmentedControl,
  BackToDashboardLink,
  Card,
  Badge,
  EmptyState,
  Button,
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
  const initialView: RoutinesView =
    viewFromUrl === 'assignments' || viewFromUrl === 'calendar' ? viewFromUrl : 'library';

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [view, setView] = useState<RoutinesView>(initialView);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isAssigningFromCalendar, setIsAssigningFromCalendar] = useState(false);
  const [assignSingleDay, setAssignSingleDay] = useState(false);
  const [assignForm, setAssignForm] = useState({
    user_id: '',
    routine_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
  });
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [newRoutine, setNewRoutine] = useState({ name: '', difficulty: 'Beginner' });
  const [expandedRoutineId, setExpandedRoutineId] = useState<number | null>(null);
  const [isEditingExercise, setIsEditingExercise] = useState(false);
  const [editingExercise, setEditingExercise] = useState<RoutineExercise | null>(null);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
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
  const { data: exercisesCatalog = [] } = useExercisesCatalogQuery(isStaffRoutines);
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
    } else if (!param) {
      setView('library');
    }
    if (searchParams.get('assign') === '1') {
      setIsAssigningFromCalendar(true);
    }
  }, [searchParams]);

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
    if (!newRoutine.name || !user) return;
    try {
      const res = await apiFetch('/api/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newRoutine, trainer_id: user.id }),
      });
      await parseJsonResponse(res);
      setIsCreating(false);
      setNewRoutine({ name: '', difficulty: 'Beginner' });
      refreshRoutines();
    } catch (err) {
      clientLogger.error('Failed to create routine', err);
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
    <div className="page-stack-tight">
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
            title={
              user?.role === 'member' ? (
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
                ? 'Rutinas asignadas por tu entrenador'
                : 'Plantillas y calendario'
            }
            action={<BackToDashboardLink />}
          />

          {isMember &&
            (memberRoutineHighlights.upcoming.length > 0 ||
              memberRoutineHighlights.ending.length > 0) && (
              <Card padding="sm" rounded="xl" className="space-y-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Asignaciones</h3>
                {memberRoutineHighlights.upcoming.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
                      Próximas
                    </p>
                    {memberRoutineHighlights.upcoming.map((routine) => (
                      <div
                        key={routine.id}
                        className="bg-brand/5 border-brand/15 flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                            {routine.name}
                          </p>
                          {routine.start_date && (
                            <p className="text-[11px] text-zinc-500">
                              Inicia{' '}
                              {format(parseDateOnly(routine.start_date), 'dd MMM yyyy', {
                                locale: es,
                              })}
                            </p>
                          )}
                        </div>
                        <Badge variant="default">Próxima</Badge>
                      </div>
                    ))}
                  </div>
                )}
                {memberRoutineHighlights.ending.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
                      Por vencer
                    </p>
                    {memberRoutineHighlights.ending.map((routine) => (
                      <div
                        key={routine.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-orange-500/20 bg-orange-500/5 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                            {routine.name}
                          </p>
                          {routine.end_date && (
                            <p className="text-[11px] text-zinc-500">
                              Hasta{' '}
                              {format(parseDateOnly(routine.end_date), 'dd MMM yyyy', {
                                locale: es,
                              })}
                            </p>
                          )}
                        </div>
                        <Badge variant="warning">Por vencer</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

          {user?.role !== 'member' && (
            <SegmentedControl
              variant="compact"
              fullWidth
              className="w-full sm:w-auto"
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
            editingRoutine={editingRoutine}
            setEditingRoutine={setEditingRoutine}
            handleUpdateRoutine={handleUpdateRoutine}
            isAddingExercise={isAddingExercise}
            setIsAddingExercise={setIsAddingExercise}
            availableExercises={availableExercises}
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

          {view === 'library' ? (
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
                setIsCreating(true);
              }}
              onAddExercise={(routineId) => {
                setExpandedRoutineId(routineId);
                setAddExerciseError(null);
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
              completedRoutineIdsToday={
                isMember ? (memberStatsCtx?.stats?.completedRoutineIdsToday ?? []) : undefined
              }
              activeRoutineIds={
                isMember
                  ? (memberStatsCtx?.stats?.activeSessions?.map((s) => s.routine_id) ?? [])
                  : undefined
              }
            />
          ) : view === 'calendar' ? (
            <RoutinesCalendarView
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay}
              calendarDays={calendarDays}
              assignmentsByDay={assignmentsByDay}
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
              onNavigateToMemberRoutines={(memberId) => navigate(`/members/${memberId}/routines`)}
            />
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
