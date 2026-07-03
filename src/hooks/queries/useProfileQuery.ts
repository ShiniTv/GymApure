import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, parseJsonOptional, parseJsonResponse } from '../../lib/api';

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  cedula: string | null;
  phone: string | null;
  initial_weight: number | null;
  height: number | null;
  goal: string | null;
  profile_image: string | null;
  dob: string | null;
  training_shift?: 'diurno' | 'vespertino' | 'nocturno' | null;
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

export interface MemberSubscription {
  membership_name: string;
  days_remaining: number;
  end_date: string;
  status: string;
}

export interface WorkoutSession {
  id: number;
  start_time: string;
  routine_name: string;
}

export function profileQueryKey(userId: number) {
  return ['profile', userId] as const;
}

export function useProfileQuery(userId: number | undefined) {
  return useQuery({
    queryKey: profileQueryKey(userId ?? 0),
    queryFn: async () => {
      const res = await apiFetch(`/api/users/${userId}`);
      return parseJsonResponse<UserProfile>(res);
    },
    enabled: Boolean(userId),
  });
}

export function useProfileMeasurementsQuery(userId: number | undefined) {
  return useQuery({
    queryKey: ['profile', userId, 'measurements'],
    queryFn: async () => {
      const res = await apiFetch(`/api/users/${userId}/measurements`);
      const data = await parseJsonResponse<Measurement[]>(res);
      return Array.isArray(data) ? data : [];
    },
    enabled: Boolean(userId),
  });
}

export function useProfileSubscriptionQuery(userId: number | undefined, isMember: boolean) {
  return useQuery({
    queryKey: ['profile', userId, 'subscription'],
    queryFn: async () => {
      const res = await apiFetch(`/api/memberships/user/${userId}`);
      const data = await parseJsonOptional<MemberSubscription>(res);
      return data?.membership_name ? data : null;
    },
    enabled: Boolean(userId) && isMember,
  });
}

export function useProfileWorkoutHistoryQuery(userId: number | undefined, isMember: boolean) {
  return useQuery({
    queryKey: ['profile', userId, 'workout-history'],
    queryFn: async () => {
      const res = await apiFetch(`/api/users/${userId}/history?limit=5`);
      const data = await parseJsonResponse<{ items: WorkoutSession[] }>(res);
      return Array.isArray(data.items) ? data.items : [];
    },
    enabled: Boolean(userId) && isMember,
  });
}

export function useInvalidateProfile() {
  const qc = useQueryClient();
  return (userId: number) => {
    void qc.invalidateQueries({ queryKey: ['profile', userId] });
  };
}
