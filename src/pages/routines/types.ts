export interface RoutineExercise {
  id: number;
  routine_exercise_id: number;
  name: string;
  muscle_group: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  weight_suggestion: string;
}

export interface Routine {
  id: number;
  name: string;
  difficulty: string;
  exercise_count: number;
  trainer_id?: number;
  trainer_name?: string;
  trainer_shift?: 'diurno' | 'vespertino' | 'nocturno' | null;
  exercises?: RoutineExercise[];
}

export interface Member {
  id: number;
  role: string;
  full_name: string;
  profile_image?: string | null;
  training_shift?: 'diurno' | 'vespertino' | 'nocturno' | null;
}

export interface AssignedRoutine {
  routine_id: number;
  routine_name: string;
  difficulty: string;
  assigned_at: string;
  start_date: string | null;
  end_date: string | null;
  exercise_count: number;
}

export interface RoutineAssignmentMember {
  id: number;
  full_name: string;
  profile_image: string | null;
  routines: AssignedRoutine[];
}

export interface ExerciseOption {
  id: number;
  name: string;
  muscle_group: string;
}

export interface CalendarAssignment {
  member_id: number;
  member_name: string;
  routine_name: string;
  difficulty: string;
}

export type RoutinesView = 'library' | 'assignments' | 'calendar';
