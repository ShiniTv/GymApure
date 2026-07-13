import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import type { ActivityLevel, BiologicalSex } from '../../lib/metabolicRate';

export interface HealthProfile {
  user_id: number;
  condition_flags: string[];
  condition_labels: { id: string; label: string }[];
  conditions_notes: string | null;
  limitations_notes: string | null;
  allergies_notes: string | null;
  medications_notes: string | null;
  sex: BiologicalSex | null;
  activity_level: ActivityLevel | null;
  bmr_kcal: number | null;
  tdee_kcal: number | null;
  weight_used_kg: number | null;
  health_consent_at: string | null;
  metabolic_computed_at: string | null;
  updated_at: string | null;
}

export interface HealthProfilePatch {
  condition_flags?: string[];
  conditions_notes?: string | null;
  limitations_notes?: string | null;
  allergies_notes?: string | null;
  medications_notes?: string | null;
  sex?: BiologicalSex | null;
  activity_level?: ActivityLevel | null;
  health_consent?: boolean;
  compute_metabolic?: boolean;
}

export function healthProfileQueryKey(userId: number) {
  return ['health-profile', userId] as const;
}

export function useHealthProfileQuery(userId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: healthProfileQueryKey(userId ?? 0),
    queryFn: async () => {
      const res = await apiFetch(`/api/users/${userId}/health-profile`);
      return parseJsonResponse<HealthProfile>(res);
    },
    enabled: Boolean(userId) && enabled,
  });
}

export function useUpdateHealthProfileMutation(userId: number | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: HealthProfilePatch) => {
      const res = await apiFetch(`/api/users/${userId}/health-profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return parseJsonResponse<HealthProfile>(res);
    },
    onSuccess: (data) => {
      if (userId) {
        queryClient.setQueryData(healthProfileQueryKey(userId), data);
      }
    },
  });
}
