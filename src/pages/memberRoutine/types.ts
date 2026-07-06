export interface Routine {
  id: number;
  name: string;
  difficulty: string;
  assigned_at: string;
  start_date?: string;
  end_date?: string;
  exercise_count?: number;
  exercises?: Exercise[];
}

export interface Exercise {
  id: number;
  routine_exercise_id: number;
  name: string;
  muscle_group: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  weight_suggestion: string;
}

export interface MemberUser {
  id: number;
  full_name: string;
  email: string;
  initial_weight?: number | null;
  height?: number | null;
  goal?: string | null;
}

export interface Subscription {
  membership_name: string;
  days_remaining: number;
  end_date: string;
  status: string;
}

export interface Measurement {
  id: number;
  date: string;
  weight: number | null;
  body_fat_percentage: number | null;
  waist: number | null;
  arm: number | null;
  leg: number | null;
}

export interface RoutineOption {
  id: number;
  name: string;
  difficulty: string;
}

export interface ExerciseOption {
  id: number;
  name: string;
  muscle_group: string;
}
