import { useState, useEffect, useMemo, useRef } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import {
  useRoutinesLibraryQuery,
  useMemberRoutinesQuery,
  useMemberOptionsQuery,
  useRoutineAssignmentsQuery,
  useInvalidateRoutines,
} from '../hooks/queries/useRoutinesQuery';
import { useExercisesQuery } from '../hooks/queries/useExercisesQuery';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageHeader, SegmentedControl, BackToDashboardLink } from '../components/ui';
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
  parseISO,
} from 'date-fns';
import type {
  Routine,
  RoutineExercise,
  RoutineAssignmentMember,
  ExerciseOption,
  CalendarAssignment,
  RoutinesView,
} from './routines/types';
import { RoutineModals } from './routines/RoutineModals';
import { RoutinesLibraryView } from './routines/RoutinesLibraryView';
import { RoutinesAssignmentsView } from './routines/RoutinesAssignmentsView';
import { RoutinesCalendarView } from './routines/RoutinesCalendarView';

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
  const [newExercise, setNewExercise] = useState({
    exercise_id: '',
    sets: 3,
    reps: 10,
    rest_seconds: 60,
    weight_suggestion: '',
  });
  const [deleteRoutineTarget, setDeleteRoutineTarget] = useState<Routine | null>(null);
  const [deleteRoutineError, setDeleteRoutineError] = useState<string | null>(null);
  const [deletingRoutine, setDeletingRoutine] = useState(false);
  const [deleteExerciseTarget, setDeleteExerciseTarget] = useState<{ routineId: number; exercise: RoutineExercise } | null>(null);
  const [deletingExercise, setDeletingExercise] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();
  const invalidateRoutines = useInvalidateRoutines();
  const isMember = user?.role === 'member';
  const isStaffRoutines = user?.role === 'admin' || user?.role === 'trainer';
  const { data: libraryRoutines, isPending: libraryLoading } = useRoutinesLibraryQuery(!isMember && !!user);
  const { data: memberRoutines, isPending: memberLoading } = useMemberRoutinesQuery(
    user?.id,
    isMember && !!user
  );
  const { data: members = [] } = useMemberOptionsQuery(!isMember && !!user);
  const { data: exercisesCatalog = [] } = useExercisesQuery(isStaffRoutines);
  const { data: assignments = [], isPending: loadingAssignments } =
    useRoutineAssignmentsQuery(isStaffRoutines);
  const loadingRoutines = isMember ? memberLoading : libraryLoading;
  const availableExercises = exercisesCatalog as ExerciseOption[];

  useEffect(() => {
    const next = isMember ? (memberRoutines ?? []) : (libraryRoutines ?? []);
    setRoutines(next);
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
  }, [searchParams]);

  const refreshRoutineExercises = async (routineId: number) => {
    const res = await apiFetch(`/api/routines/${routineId}`);
    const data = await parseJsonResponse<{ exercises: RoutineExercise[] }>(res);
    setRoutines((prev) =>
      prev.map((r) => (r.id === routineId ? { ...r, exercises: data.exercises } : r))
    );
  };

  const refreshRoutines = () => invalidateRoutines();

  const handleInlineUpdate = async (routineId: number, exercise: RoutineExercise, field: 'sets' | 'reps', value: number) => {
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
          weight_suggestion: updatedExercise.weight_suggestion,
        }),
      });
      await parseJsonResponse(res);
      setRoutines((prev) =>
        prev.map((r) =>
          r.id === routineId
            ? { ...r, exercises: r.exercises?.map((e) => (e.routine_exercise_id === exercise.routine_exercise_id ? updatedExercise : e)) }
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
      const res = await apiFetch(`/api/routines/${routineId}/exercises/${exercise.routine_exercise_id}`, { method: 'DELETE' });
      await parseJsonResponse(res);
      setDeleteExerciseTarget(null);
      await refreshRoutineExercises(routineId);
      refreshRoutines();
    } catch (err) {
      clientLogger.error('Failed to delete routine exercise', err);
    } finally {
      setDeletingExercise(false);
    }
  };

  const handleRoutineCardClick = (routineId: number) => {
    if (expandedRoutineId === routineId) return;
    if (user?.role === 'member') {
      navigate(`/workout/${routineId}`);
      return;
    }
    if (user?.role === 'trainer' || user?.role === 'admin') {
      void toggleExpandRoutine(routineId);
    }
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
          weight_suggestion: editingExercise.weight_suggestion,
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

  const handleAddWorkoutExercise = async () => {
    if (!newExercise.exercise_id || !expandedRoutineId) return;
    try {
      const res = await apiFetch(`/api/routines/${expandedRoutineId}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newExercise, exercise_id: parseInt(newExercise.exercise_id) }),
      });
      await parseJsonResponse(res);
      setIsAddingExercise(false);
      setNewExercise({ exercise_id: '', sets: 3, reps: 10, rest_seconds: 60, weight_suggestion: '' });
      await refreshRoutineExercises(expandedRoutineId);
      refreshRoutines();
    } catch (err) {
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
      await parseJsonResponse(res);
      setIsAssigningFromCalendar(false);
      setAssignForm((prev) => ({ ...prev, user_id: '', routine_id: '' }));
      invalidateRoutines();
    } catch (err) {
      clientLogger.error('Failed to assign routine', err);
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
          const start = parseISO(routine.start_date);
          const end = parseISO(routine.end_date);
          if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return;
          calendarDays.forEach((day) => {
            if (isWithinInterval(day, { start, end })) {
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

  const calendarAutoSelected = useRef(false);

  useEffect(() => {
    if (view !== 'calendar') {
      calendarAutoSelected.current = false;
    }
  }, [view]);

  useEffect(() => {
    if (view !== 'calendar' || loadingAssignments || calendarAutoSelected.current) return;
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    if (assignmentsByDay[todayStr]?.length) {
      setSelectedDay(today);
      calendarAutoSelected.current = true;
    }
  }, [view, loadingAssignments, assignmentsByDay]);

  return (
    <div className="page-stack-tight">
      <PageHeader
        compact
        title={
          user?.role === 'member' ? (
            <>Mis <span className="text-brand">rutinas</span></>
          ) : (
            <>Gestión de <span className="text-brand">rutinas</span></>
          )
        }
        subtitle={
          user?.role === 'member'
            ? 'Rutinas asignadas por tu entrenador'
            : 'Plantillas y calendario'
        }
        action={<BackToDashboardLink />}
      />

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
        setIsAssigningFromCalendar={setIsAssigningFromCalendar}
        assignForm={assignForm}
        setAssignForm={setAssignForm}
        members={members}
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
          onCreateRoutine={() => setIsCreating(true)}
          onAddExercise={() => setIsAddingExercise(true)}
          onInlineUpdate={handleInlineUpdate}
          onEditExercise={(exercise) => {
            setEditingExercise(exercise);
            setIsEditingExercise(true);
          }}
          onDeleteExercise={(routineId, exercise) => setDeleteExerciseTarget({ routineId, exercise })}
        />
      ) : view === 'calendar' ? (
        <RoutinesCalendarView
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          calendarDays={calendarDays}
          assignmentsByDay={assignmentsByDay}
          onAssignDirect={() => setIsAssigningFromCalendar(true)}
          onAssignOnDay={(dateStr) => {
            setAssignForm((prev) => ({ ...prev, start_date: dateStr }));
            setIsAssigningFromCalendar(true);
          }}
          onNavigateToMemberRoutines={(memberId) => navigate(`/members/${memberId}/routines`)}
        />
      ) : (
        <RoutinesAssignmentsView
          loadingAssignments={loadingAssignments}
          assignments={assignments}
          onChangeView={changeView}
          onNavigateToMemberRoutines={(memberId) => navigate(`/members/${memberId}/routines`)}
        />
      )}
    </div>
  );
}
