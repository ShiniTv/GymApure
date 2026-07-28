import { useQuery } from '@tanstack/react-query';
import { apiFetch, parseJsonOptional, parseJsonResponse } from '../../lib/api';
import { deriveSetPrescription, parseSetPrescriptionFromApi } from '../../lib/setPrescription';
import type {
  Exercise,
  Measurement,
  MemberUser,
  Routine,
  Subscription,
} from '../../pages/memberRoutine/types';

export interface MemberRoutineContext {
  member: MemberUser;
  routines: Routine[];
  subscription: Subscription | null;
  measurements: Measurement[];
}

export function memberRoutineContextKey(userId: number) {
  return ['member-routine', 'context', userId] as const;
}

export function memberRoutineDetailKey(routineId: number) {
  return ['member-routine', 'detail', routineId] as const;
}

export async function fetchMemberRoutineContext(userId: number): Promise<MemberRoutineContext> {
  const [userData, routinesData, subData, measurementsData] = await Promise.all([
    apiFetch(`/api/users/${userId}`).then((res) => parseJsonResponse<MemberUser>(res)),
    apiFetch(`/api/users/${userId}/routines`).then((res) => parseJsonResponse<Routine[]>(res)),
    apiFetch(`/api/memberships/user/${userId}`).then((res) => parseJsonOptional<Subscription>(res)),
    apiFetch(`/api/users/${userId}/measurements`).then((res) =>
      parseJsonResponse<Measurement[]>(res)
    ),
  ]);

  return {
    member: userData,
    routines: Array.isArray(routinesData) ? routinesData : [],
    subscription: subData?.membership_name ? subData : null,
    measurements: Array.isArray(measurementsData) ? measurementsData : [],
  };
}

export async function fetchMemberRoutines(userId: number): Promise<Routine[]> {
  const res = await apiFetch(`/api/users/${userId}/routines`);
  const data = await parseJsonResponse<Routine[]>(res);
  return Array.isArray(data) ? data : [];
}

export async function fetchRoutineExercises(routineId: number): Promise<Exercise[]> {
  const res = await apiFetch(`/api/routines/${routineId}`);
  const data = await parseJsonResponse<{ exercises: Exercise[] }>(res);
  return (Array.isArray(data.exercises) ? data.exercises : []).map((exercise) => ({
    ...exercise,
    set_prescription:
      parseSetPrescriptionFromApi(exercise.set_prescription) ??
      deriveSetPrescription(exercise.sets, exercise.reps),
  }));
}

export interface ExerciseLoadSuggestion {
  last_session: { weight: number; reps: number; completed_at: string } | null;
  rm_test: { weight: number; reps: number; estimated_1rm_kg: number } | null;
  estimated_1rm_kg: number | null;
}

export async function fetchExerciseLoadSuggestion(
  userId: number,
  exerciseId: number,
  routineId: number
): Promise<ExerciseLoadSuggestion> {
  const response = await apiFetch(
    `/api/users/${userId}/exercise-load-suggestion?exercise_id=${exerciseId}&routine_id=${routineId}`
  );
  return parseJsonResponse<ExerciseLoadSuggestion>(response);
}

/** Optional React Query wrapper for the member coaching page context. */
export function useMemberRoutineContextQuery(userId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: memberRoutineContextKey(userId ?? 0),
    queryFn: () => fetchMemberRoutineContext(userId!),
    enabled: Boolean(userId) && enabled,
  });
}
