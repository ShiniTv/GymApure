import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, parseJsonOptional, parseJsonResponse } from '../../lib/api';
import type {
  DailyNutritionSummary,
  NutritionLogEntry,
  NutritionPlan,
} from '../../lib/nutrition';

export function nutritionPlanKey(userId: number) {
  return ['nutrition', userId, 'plan'] as const;
}

export function nutritionLogsKey(userId: number, date: string) {
  return ['nutrition', userId, 'logs', date] as const;
}

export function nutritionSummaryKey(userId: number, days: number) {
  return ['nutrition', userId, 'summary', days] as const;
}

export function useNutritionPlanQuery(userId: number | undefined) {
  return useQuery({
    queryKey: nutritionPlanKey(userId ?? 0),
    queryFn: async () => {
      const res = await apiFetch(`/api/users/${userId}/nutrition/plan`);
      return parseJsonOptional<NutritionPlan>(res);
    },
    enabled: Boolean(userId),
  });
}

export function useNutritionLogsQuery(userId: number | undefined, date: string) {
  return useQuery({
    queryKey: nutritionLogsKey(userId ?? 0, date),
    queryFn: async () => {
      const res = await apiFetch(`/api/users/${userId}/nutrition/logs?date=${encodeURIComponent(date)}`);
      const data = await parseJsonResponse<NutritionLogEntry[]>(res);
      return Array.isArray(data) ? data : [];
    },
    enabled: Boolean(userId) && Boolean(date),
  });
}

export function useNutritionSummaryQuery(userId: number | undefined, days = 7) {
  return useQuery({
    queryKey: nutritionSummaryKey(userId ?? 0, days),
    queryFn: async () => {
      const res = await apiFetch(`/api/users/${userId}/nutrition/summary?days=${days}`);
      if (!res.ok) return null;
      return parseJsonResponse<{ plan: NutritionPlan; days: DailyNutritionSummary[] }>(res);
    },
    enabled: Boolean(userId),
  });
}

export function useInvalidateNutrition() {
  const qc = useQueryClient();
  return (userId: number) => {
    void qc.invalidateQueries({ queryKey: ['nutrition', userId] });
  };
}

export async function fetchMemberGoal(userId: number): Promise<string | null> {
  const res = await apiFetch(`/api/users/${userId}`);
  const data = await parseJsonOptional<{ goal?: string | null }>(res);
  return data?.goal ?? null;
}

export interface NutritionOverviewMember {
  user_id: number;
  full_name: string;
  plan_title: string;
  logged_days: number;
  adherence_percent: number;
  calories_status: string;
}

export interface NutritionOverview {
  period_days: number;
  start_date: string;
  end_date: string;
  members: NutritionOverviewMember[];
  with_plan: number;
  logging_active: number;
}

export function useNutritionOverviewQuery(enabled = true) {
  return useQuery({
    queryKey: ['nutrition', 'admin', 'overview'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/overview');
      return parseJsonResponse<NutritionOverview>(res);
    },
    enabled,
  });
}
