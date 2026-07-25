import { useQuery } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import type { InsideMember } from '../../pages/reception/types';

export interface ReceptionInsideData {
  count: number;
  members: InsideMember[];
}

async function fetchReceptionInside(): Promise<ReceptionInsideData> {
  const res = await apiFetch('/api/attendance/inside');
  return parseJsonResponse<ReceptionInsideData>(res);
}

export function useReceptionInsideQuery(enabled = true) {
  return useQuery({
    queryKey: ['reception-inside'],
    queryFn: fetchReceptionInside,
    enabled,
    staleTime: 15_000,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });
}

export interface CheckInPinSettings {
  pin: string;
  required: boolean;
  configured: boolean;
}

async function fetchCheckInPin(): Promise<CheckInPinSettings> {
  const res = await apiFetch('/api/settings/check-in-pin');
  const data = await parseJsonResponse<{
    check_in_pin?: string;
    require_self_check_in_pin?: boolean;
    pin_configured?: boolean;
  }>(res);
  return {
    pin: data.check_in_pin ?? '',
    required: Boolean(data.require_self_check_in_pin),
    configured: Boolean(data.pin_configured ?? data.check_in_pin),
  };
}

export function useCheckInPinQuery(enabled = true) {
  return useQuery({
    queryKey: ['settings', 'check-in-pin'],
    queryFn: fetchCheckInPin,
    enabled,
    staleTime: 60_000,
  });
}
