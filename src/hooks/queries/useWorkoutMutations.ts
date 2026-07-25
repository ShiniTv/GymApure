import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import type { LastSessionSetLog } from '../../pages/activeWorkout/setValues';

export interface StartWorkoutInput {
  userId: number;
  routineId: number;
}

export interface StartWorkoutResult {
  id: number;
  start_time?: string;
  logs?: {
    exercise_id: number;
    set_number: number;
    weight: number;
    reps: number;
  }[];
  last_session_logs?: LastSessionSetLog[];
}

export interface LogWorkoutSetInput {
  session_id: number | null;
  exercise_id: number;
  set_number: number;
  weight: number;
  reps: number;
}

async function postWorkout<T>(path: string, body: unknown): Promise<T> {
  const response = await apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJsonResponse<T>(response);
}

function useInvalidateWorkoutQueries() {
  const queryClient = useQueryClient();
  return async (routineId?: number) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['member-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['profile'] }),
      queryClient.invalidateQueries({ queryKey: ['routines'] }),
      ...(routineId
        ? [
            queryClient.invalidateQueries({
              queryKey: ['workout-routine', String(routineId)],
            }),
          ]
        : []),
    ]);
  };
}

export function useStartWorkoutMutation() {
  return useMutation({
    mutationFn: ({ userId, routineId }: StartWorkoutInput) =>
      postWorkout<StartWorkoutResult>('/api/workouts/start', {
        user_id: userId,
        routine_id: routineId,
      }),
  });
}

export function useLogWorkoutSetMutation() {
  return useMutation({
    mutationFn: (input: LogWorkoutSetInput) => postWorkout<unknown>('/api/workouts/log', input),
  });
}

export function useFinishWorkoutMutation() {
  const invalidate = useInvalidateWorkoutQueries();
  return useMutation({
    mutationFn: ({
      sessionId,
      success,
    }: {
      sessionId: number;
      success: boolean;
      routineId?: number;
    }) =>
      postWorkout<unknown>('/api/workouts/finish', {
        session_id: sessionId,
        success,
      }),
    onSuccess: (_data, variables) => invalidate(variables.routineId),
  });
}

export function useDiscardWorkoutMutation() {
  const invalidate = useInvalidateWorkoutQueries();
  return useMutation({
    mutationFn: ({ sessionId }: { sessionId: number; routineId?: number }) =>
      postWorkout<unknown>('/api/workouts/discard', { session_id: sessionId }),
    onSuccess: (_data, variables) => invalidate(variables.routineId),
  });
}
