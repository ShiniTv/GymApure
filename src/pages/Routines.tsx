import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch, parseJsonResponse } from '../lib/api';
import { Plus, Play, ChevronLeft, ChevronRight, Trash2, Edit, Settings2, Users, Calendar, Clock, ChevronDown, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Modal, PageHeader, Label, Input, Select } from '../components/ui';
import { clientLogger } from '../lib/clientLogger';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isWithinInterval,
  parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';

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

interface Routine {
  id: number;
  name: string;
  difficulty: string;
  exercise_count: number;
  exercises?: Exercise[];
}

interface Member {
  id: number;
  role: string;
  full_name: string;
  profile_image?: string | null;
}

interface AssignedRoutine {
  routine_id: number;
  routine_name: string;
  difficulty: string;
  assigned_at: string;
  start_date: string | null;
  end_date: string | null;
  exercise_count: number;
}

interface RoutineAssignmentMember {
  id: number;
  full_name: string;
  profile_image: string | null;
  routines: AssignedRoutine[];
}

interface ExerciseOption {
  id: number;
  name: string;
  muscle_group: string;
}

interface CalendarAssignment {
  member_name: string;
  routine_name: string;
  difficulty: string;
}

export default function Routines() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [view, setView] = useState<'library' | 'assignments' | 'calendar'>('library');
  const [assignments, setAssignments] = useState<RoutineAssignmentMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isAssigningFromCalendar, setIsAssigningFromCalendar] = useState(false);
  const [assignForm, setAssignForm] = useState({
    user_id: '',
    routine_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd')
  });
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [newRoutine, setNewRoutine] = useState({ name: '', difficulty: 'Beginner' });
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

  const navigate = useNavigate();
  const { user } = useAuth();

  const refreshRoutineExercises = async (routineId: number) => {
    const res = await apiFetch(`/api/routines/${routineId}`);
    const data = await parseJsonResponse<{ exercises: Exercise[] }>(res);
    setRoutines((prev) =>
      prev.map((r) => (r.id === routineId ? { ...r, exercises: data.exercises } : r))
    );
  };

  const apiFetchRoutines = () => {
    if (user?.role === 'member' && user.id) {
      apiFetch(`/api/users/${user.id}/routines`)
        .then((res) => parseJsonResponse<(Routine & { exercise_count?: number })[]>(res))
        .then((data) => {
          setRoutines(
            Array.isArray(data)
              ? data.map((r) => ({
                  ...r,
                  exercise_count: r.exercise_count ?? 0,
                }))
              : []
          );
        })
        .catch(() => setRoutines([]));
      return;
    }

    apiFetch('/api/routines')
      .then((res) => parseJsonResponse<Routine[]>(res))
      .then((data) => setRoutines(Array.isArray(data) ? data : []))
      .catch((err) => {
        clientLogger.error('Failed to fetch routines', err);
        setRoutines([]);
      });
  };

  useEffect(() => {
    apiFetchRoutines();
    if (user?.role !== 'member') {
      apiFetchAssignments();
      apiFetchMembers();
    }
  }, [user]);

  const apiFetchMembers = () => {
    apiFetch('/api/users/options?role=member')
      .then((res) => parseJsonResponse<Member[]>(res))
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch((err) => {
        clientLogger.error('Failed to fetch members for assignments', err);
        setMembers([]);
      });
  };

  const apiFetchAssignments = () => {
    setLoadingAssignments(true);
    apiFetch('/api/routines/assignments/all')
      .then((res) => parseJsonResponse<RoutineAssignmentMember[]>(res))
      .then((data) => setAssignments(Array.isArray(data) ? data : []))
      .catch((err) => {
        clientLogger.error('Failed to fetch routine assignments', err);
        setAssignments([]);
      })
      .finally(() => setLoadingAssignments(false));
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
      clientLogger.error('Failed to inline update exercise', err);
    }
  };

  const handleCreateRoutine = async () => {
    if (!newRoutine.name || !user) return;

    try {
      const res = await apiFetch('/api/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRoutine,
          trainer_id: user.id
        }),
      });

      await parseJsonResponse(res);
      setIsCreating(false);
      setNewRoutine({ name: '', difficulty: 'Beginner' });
      apiFetchRoutines();
    } catch (err) {
      clientLogger.error('Failed to create routine', err);
    }
  };

  const handleUpdateRoutine = async () => {
    if (!editingRoutine || !editingRoutine.name) return;

    try {
      const res = await apiFetch(`/api/routines/${editingRoutine.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingRoutine.name,
          difficulty: editingRoutine.difficulty
        }),
      });

      await parseJsonResponse(res);
      setEditingRoutine(null);
      apiFetchRoutines();
    } catch (err) {
      clientLogger.error('Failed to update routine', err);
    }
  };

  const handleDeleteRoutine = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de que deseas eliminar esta rutina? Esta acción no se puede deshacer y eliminará todo el historial asociado.')) return;

    try {
      const res = await apiFetch(`/api/routines/${id}`, {
        method: 'DELETE',
      });
      await parseJsonResponse(res);
      apiFetchRoutines();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
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

  const apiFetchAvailableExercises = () => {
    apiFetch('/api/exercises')
      .then((res) => parseJsonResponse<ExerciseOption[]>(res))
      .then((data) => setAvailableExercises(Array.isArray(data) ? data : []))
      .catch(err => {
        clientLogger.error('Failed to fetch exercise catalog', err);
        setAvailableExercises([]);
      });
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
    if (!confirm('¿Estás seguro de que deseas eliminar este ejercicio de la plantilla?')) return;

    try {
      const res = await apiFetch(`/api/routines/${routineId}/exercises/${routineExerciseId}`, {
        method: 'DELETE',
      });

      await parseJsonResponse(res);
      await refreshRoutineExercises(routineId);
      apiFetchRoutines();
    } catch (err) {
      clientLogger.error('Failed to delete routine exercise', err);
    }
  };

  const handleAddWorkoutExercise = async () => {
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
      apiFetchRoutines();
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
          end_date: assignForm.end_date
        }),
      });

      await parseJsonResponse(res);
      setIsAssigningFromCalendar(false);
      setAssignForm((prev) => ({ ...prev, user_id: '', routine_id: '' }));
      apiFetchAssignments();
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
                member_name: member.full_name,
                routine_name: routine.routine_name,
                difficulty: routine.difficulty
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={<>GESTIÓN DE <span className="text-orange-500">RUTINAS</span></>}
        subtitle={
          user?.role === 'member'
            ? 'Tus rutinas asignadas por el entrenador'
            : 'Gestiona plantillas y asignaciones de Caribean Gym'
        }
        action={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {user?.role !== 'member' && (
              <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl">
                <button
                  onClick={() => setView('library')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    view === 'library'
                      ? 'bg-white dark:bg-zinc-700 text-orange-600 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  Biblioteca
                </button>
                <button
                  onClick={() => setView('assignments')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    view === 'assignments'
                      ? 'bg-white dark:bg-zinc-700 text-orange-600 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  Asignaciones
                </button>
                <button
                  onClick={() => setView('calendar')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    view === 'calendar'
                      ? 'bg-white dark:bg-zinc-700 text-orange-600 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  Calendario
                </button>
              </div>
            )}
            {view === 'library' && (
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-5 w-5" />
                Nueva Rutina
              </Button>
            )}
          </div>
        }
      />

      <Modal
        open={isAssigningFromCalendar}
        onClose={() => setIsAssigningFromCalendar(false)}
        title={<>ASIGNAR <span className="text-orange-500">RUTINA</span></>}
      >
        <div className="space-y-4">
          <div>
            <Label>Seleccionar Miembro</Label>
            <Select
              value={assignForm.user_id}
              onChange={(e) => setAssignForm({ ...assignForm, user_id: e.target.value })}
            >
              <option value="">Selección...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Seleccionar Rutina</Label>
            <Select
              className="font-mono text-sm"
              value={assignForm.routine_id}
              onChange={(e) => setAssignForm({ ...assignForm, routine_id: e.target.value })}
            >
              <option value="">Selección...</option>
              {routines.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.difficulty})</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Inicio</Label>
              <Input
                type="date"
                value={assignForm.start_date}
                onChange={(e) => setAssignForm({ ...assignForm, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Fin</Label>
              <Input
                type="date"
                value={assignForm.end_date}
                onChange={(e) => setAssignForm({ ...assignForm, end_date: e.target.value })}
              />
            </div>
          </div>
          <Button
            variant="secondary"
            className="w-full"
            size="lg"
            onClick={handleQuickAssign}
            disabled={!assignForm.user_id || !assignForm.routine_id}
          >
            <UserPlus className="h-5 w-5" />
            Asignar Rutina
          </Button>
        </div>
      </Modal>

      <Modal
        open={isCreating}
        onClose={() => setIsCreating(false)}
        title={<>NUEVA <span className="text-orange-500">RUTINA</span></>}
      >
        <div className="space-y-4">
          <div>
            <Label>Nombre de la Rutina</Label>
            <Input
              type="text"
              value={newRoutine.name}
              onChange={(e) => setNewRoutine({ ...newRoutine, name: e.target.value })}
              placeholder="Ej: Full Body"
            />
          </div>
          <div>
            <Label>Dificultad</Label>
            <Select
              className="uppercase tracking-tighter"
              value={newRoutine.difficulty}
              onChange={(e) => setNewRoutine({ ...newRoutine, difficulty: e.target.value })}
            >
              <option value="Beginner">PRINCIPIANTE</option>
              <option value="Intermediate">INTERMEDIO</option>
              <option value="Advanced">AVANZADO</option>
            </Select>
          </div>
          <Button className="w-full" size="lg" onClick={handleCreateRoutine} disabled={!newRoutine.name}>
            Crear Rutina
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!editingRoutine}
        onClose={() => setEditingRoutine(null)}
        title="Editar Rutina"
      >
        {editingRoutine && (
          <div className="space-y-4">
            <div>
              <Label>Nombre de la Rutina</Label>
              <Input
                type="text"
                value={editingRoutine.name}
                onChange={(e) => setEditingRoutine({ ...editingRoutine, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Dificultad</Label>
              <Select
                value={editingRoutine.difficulty}
                onChange={(e) => setEditingRoutine({ ...editingRoutine, difficulty: e.target.value })}
              >
                <option value="Beginner">Principiante</option>
                <option value="Intermediate">Intermedio</option>
                <option value="Advanced">Avanzado</option>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setEditingRoutine(null)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleUpdateRoutine} disabled={!editingRoutine.name}>
                Guardar
              </Button>
            </div>
          </div>
        )}
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
          <Button className="w-full" onClick={handleAddWorkoutExercise} disabled={!newExercise.exercise_id}>
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

      {view === 'library' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {routines.map((routine) => (
            <div 
              key={routine.id} 
              className={`flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:border-orange-500/50 hover:shadow-lg transition-all ${expandedRoutineId === routine.id ? 'col-span-full ring-2 ring-orange-500/20' : ''}`}
            >
              <div 
                onClick={() => expandedRoutineId !== routine.id && navigate(`/workout/${routine.id}`)}
                className="p-6 cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl group-hover:bg-orange-500/10 transition-colors">
                    <Play className="h-6 w-6 text-zinc-400 group-hover:text-orange-500" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                      routine.difficulty === 'Advanced' ? 'bg-red-500/10 text-red-600 dark:text-red-500' :
                      routine.difficulty === 'Intermediate' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500' :
                      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'
                    }`}>
                      {routine.difficulty}
                    </span>
                    {user?.role === 'trainer' && (
                      <>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingRoutine(routine);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
                          title="Configurar Rutina"
                        >
                          <Settings2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteRoutine(e, routine.id)}
                          className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
                          title="Eliminar Rutina"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic leading-none">{routine.name}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-500 mt-2 mb-6">{routine.exercise_count} Ejercicios</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs font-black uppercase tracking-widest text-orange-600 dark:text-orange-500 group-hover:translate-x-1 transition-transform italic">
                    Empezar <ChevronRight className="h-4 w-4 ml-1" />
                  </div>
                  {user?.role === 'trainer' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpandRoutine(routine.id);
                      }}
                      className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${
                        expandedRoutineId === routine.id 
                          ? 'bg-zinc-900 text-white border-zinc-900' 
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-orange-500 hover:text-orange-600'
                      }`}
                    >
                      {expandedRoutineId === routine.id ? 'Cerrar Editor' : 'Gestionar Ejercicios'}
                    </button>
                  )}
                </div>
              </div>

              {expandedRoutineId === routine.id && (
                <div className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-6 space-y-6 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Ejercicios de la Plantilla</h4>
                    <button 
                      onClick={() => {
                        setIsAddingExercise(true);
                        apiFetchAvailableExercises();
                      }}
                      className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-sm hover:scale-105 transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Añadir
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {routine.exercises?.map((exercise) => (
                      <div key={exercise.routine_exercise_id} className="bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 p-4 rounded-2xl flex justify-between items-start shadow-sm hover:shadow-md transition-all">
                        <div>
                          <h5 className="font-bold text-zinc-900 dark:text-white uppercase tracking-tight text-sm">{exercise.name}</h5>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{exercise.muscle_group}</p>
                          <div className="mt-3 grid grid-cols-2 gap-y-2 text-[11px]">
                            <div className="flex items-center gap-1.5 text-zinc-500">
                              Sets: 
                              <input 
                                type="number"
                                className="w-10 bg-zinc-100 dark:bg-zinc-700 border-none rounded-md px-1 py-0.5 text-center font-bold text-zinc-900 dark:text-white focus:ring-1 focus:ring-orange-500"
                                defaultValue={exercise.sets}
                                onBlur={(e) => handleInlineUpdate(routine.id, exercise, 'sets', parseInt(e.target.value))}
                                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                              />
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-500">
                              Reps: 
                              <input 
                                type="number"
                                className="w-10 bg-zinc-100 dark:bg-zinc-700 border-none rounded-md px-1 py-0.5 text-center font-bold text-zinc-900 dark:text-white focus:ring-1 focus:ring-orange-500"
                                defaultValue={exercise.reps}
                                onBlur={(e) => handleInlineUpdate(routine.id, exercise, 'reps', parseInt(e.target.value))}
                                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                              />
                            </div>
                            <div className="text-zinc-500">Rst: <span className="text-zinc-900 dark:text-white font-bold">{exercise.rest_seconds}s</span></div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => {
                              setEditingExercise(exercise);
                              setIsEditingExercise(true);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
                            title="Editar parámetros"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteExercise(routine.id, exercise.routine_exercise_id)}
                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Eliminar de la plantilla"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!routine.exercises || routine.exercises.length === 0) && (
                      <div className="col-span-full py-8 text-center text-zinc-400 text-xs italic border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl">
                        No hay ejercicios en esta plantilla
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : view === 'calendar' ? (
        <div className="space-y-6">
          <Card padding="lg" rounded="3xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase">
                  {format(currentDate, 'MMMM yyyy', { locale: es })}
                </h2>
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                  <button 
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                    className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-zinc-500 transition-all"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                    className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-zinc-500 transition-all"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <Button onClick={() => setIsAssigningFromCalendar(true)} size="sm">
                <Plus className="h-4 w-4" />
                Asignar Directo
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-px bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-inner">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="bg-zinc-50 dark:bg-zinc-900/50 py-3 text-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  {day}
                </div>
              ))}
              {calendarDays.map((day, idx) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayAssignments = assignmentsByDay[dateStr] || [];
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const isToday = isSameDay(day, new Date());
                const isOtherMonth = !isSameMonth(day, currentDate);

                return (
                  <div 
                    key={idx}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[120px] p-2 bg-white dark:bg-zinc-900 transition-all cursor-pointer border-t border-l border-zinc-100 dark:border-zinc-800 relative group
                      ${isOtherMonth ? 'opacity-30' : 'opacity-100'} 
                      ${isSelected ? 'bg-orange-500/5 dark:bg-orange-500/10' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-black tracking-tighter ${isToday ? 'bg-orange-500 text-white h-6 w-6 rounded-full flex items-center justify-center' : 'text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'}`}>
                        {format(day, 'd')}
                      </span>
                      {dayAssignments.length > 0 && (
                        <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded">
                          {dayAssignments.length}
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-2 space-y-1 overflow-hidden h-[80px]">
                      {dayAssignments.slice(0, 3).map((a, i) => (
                        <div key={i} className="text-[9px] font-bold truncate bg-zinc-100 dark:bg-zinc-800/50 px-1.5 py-1 rounded text-zinc-600 dark:text-zinc-400 border-l-2 border-orange-500">
                          {a.member_name}: {a.routine_name}
                        </div>
                      ))}
                      {dayAssignments.length > 3 && (
                        <div className="text-[8px] font-black uppercase text-zinc-400 text-center cursor-help" title={dayAssignments.slice(3).map(a => a.member_name).join(', ')}>
                          + {dayAssignments.length - 3} más
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <div className="absolute inset-0 border-2 border-orange-500 pointer-events-none rounded-sm"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {selectedDay && (
            <Card padding="md" rounded="3xl" className="animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">
                    DETALLES DEL <span className="text-orange-500">{format(selectedDay, 'dd MMMM', { locale: es }).toUpperCase()}</span>
                  </h3>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Actividad deportiva programada</p>
                </div>
                <button 
                  onClick={() => {
                    const dateStr = format(selectedDay, 'yyyy-MM-dd');
                    setAssignForm(prev => ({ ...prev, start_date: dateStr }));
                    setIsAssigningFromCalendar(true);
                  }}
                  className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105"
                >
                  <UserPlus className="h-4 w-4" />
                  Asignar en este día
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(assignmentsByDay[format(selectedDay, 'yyyy-MM-dd')] || []).map((a, i) => (
                  <div key={i} className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                      <Play className="h-5 w-5 flex-shrink-0" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-sm text-zinc-900 dark:text-white truncate uppercase tracking-tight leading-none">{a.member_name}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-1 truncate">
                        {a.routine_name} • <span className={a.difficulty === 'Advanced' ? 'text-red-500' : 'text-emerald-500'}>{a.difficulty}</span>
                      </p>
                    </div>
                  </div>
                ))}
                {(!assignmentsByDay[format(selectedDay, 'yyyy-MM-dd')] || assignmentsByDay[format(selectedDay, 'yyyy-MM-dd')].length === 0) && (
                  <div className="col-span-full py-12 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl">
                    No hay asignaciones para este día
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      ) : (
        /* Assignments View */
        <div className="space-y-8">
          {loadingAssignments ? (
            <div className="py-20 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="mt-4 text-zinc-500 font-bold uppercase tracking-widest text-xs">Cargando asignaciones...</p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="py-20 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
              <Users className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
              <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">No hay rutinas asignadas actualmente</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {assignments.map((member) => (member.routines && member.routines.length > 0) && (
                <div 
                  key={member.id} 
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-4 mb-6">
                    {member.profile_image ? (
                      <img src={member.profile_image} alt={member.full_name} className="h-14 w-14 rounded-2xl object-cover ring-2 ring-orange-500/20" />
                    ) : (
                      <div className="h-14 w-14 rounded-2xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 font-black text-xl italic shadow-sm">
                        {member.full_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-black text-zinc-900 dark:text-white uppercase tracking-tight text-lg leading-tight">{member.full_name}</h3>
                      <button 
                        onClick={() => navigate(`/members/${member.id}/routines`)}
                        className="text-[10px] font-black text-orange-600 dark:text-orange-500 uppercase tracking-widest hover:underline mt-0.5"
                      >
                        Ver Perfil Completo
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {member.routines.map((routine) => (
                      <div 
                        key={routine.routine_id}
                        className="bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50 rounded-2xl p-4 group hover:bg-white dark:hover:bg-zinc-800 transition-all cursor-pointer"
                        onClick={() => navigate(`/members/${member.id}/routines`)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-zinc-900 dark:text-white uppercase tracking-tight text-sm group-hover:text-orange-500 transition-colors">{routine.routine_name}</h4>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            routine.difficulty === 'Advanced' ? 'bg-red-500/10 text-red-600' :
                            routine.difficulty === 'Intermediate' ? 'bg-yellow-500/10 text-yellow-600' :
                            'bg-emerald-500/10 text-emerald-600'
                          }`}>
                            {routine.difficulty}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-y-1 gap-x-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-orange-500" />
                            {routine.exercise_count} Ejer.
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-blue-500" />
                            {routine.start_date ? new Date(routine.start_date).toLocaleDateString() : 'N/A'} - {routine.end_date ? new Date(routine.end_date).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
