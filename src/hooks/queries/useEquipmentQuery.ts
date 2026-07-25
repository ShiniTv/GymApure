import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiFetch, parseJsonResponse } from '../../lib/api';
import type {
  CatalogItem,
  EquipmentItem,
  MaintenanceEvent,
  Vendor,
  Zone,
} from '../../pages/equipment/types';

export const equipmentRootKey = ['equipment'] as const;

export function equipmentInventoryKey(q: string) {
  return [...equipmentRootKey, 'inventory', { q }] as const;
}

export function equipmentZonesKey() {
  return [...equipmentRootKey, 'zones'] as const;
}

export function equipmentCatalogKey() {
  return [...equipmentRootKey, 'catalog'] as const;
}

export function equipmentVendorsKey() {
  return [...equipmentRootKey, 'vendors'] as const;
}

export function equipmentDetailKey(id: number) {
  return [...equipmentRootKey, 'detail', id] as const;
}

async function fetchInventory(q: string): Promise<EquipmentItem[]> {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  const res = await apiFetch(`/api/equipment?${params.toString()}`);
  const data = await parseJsonResponse<EquipmentItem[]>(res);
  return Array.isArray(data) ? data : [];
}

async function fetchZones(): Promise<Zone[]> {
  const res = await apiFetch('/api/equipment/zones');
  const data = await parseJsonResponse<Zone[]>(res);
  return Array.isArray(data) ? data : [];
}

async function fetchCatalog(): Promise<CatalogItem[]> {
  const res = await apiFetch('/api/equipment/catalog');
  const data = await parseJsonResponse<CatalogItem[]>(res);
  return Array.isArray(data) ? data : [];
}

async function fetchVendors(): Promise<Vendor[]> {
  const res = await apiFetch('/api/equipment/vendors');
  const data = await parseJsonResponse<Vendor[]>(res);
  return Array.isArray(data) ? data : [];
}

export interface EquipmentDetailPayload {
  equipment: EquipmentItem;
  events: MaintenanceEvent[];
}

async function fetchDetail(id: number): Promise<EquipmentDetailPayload> {
  const res = await apiFetch(`/api/equipment/${id}`);
  const data = await parseJsonResponse<{
    equipment: EquipmentItem;
    events: MaintenanceEvent[];
  }>(res);
  return {
    equipment: data.equipment,
    events: Array.isArray(data.events) ? data.events : [],
  };
}

export function useEquipmentInventoryQuery(search: string) {
  return useQuery({
    queryKey: equipmentInventoryKey(search),
    queryFn: () => fetchInventory(search),
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });
}

export function useEquipmentZonesQuery() {
  return useQuery({
    queryKey: equipmentZonesKey(),
    queryFn: fetchZones,
    staleTime: 60_000,
  });
}

export function useEquipmentCatalogQuery() {
  return useQuery({
    queryKey: equipmentCatalogKey(),
    queryFn: fetchCatalog,
    staleTime: 60_000,
  });
}

export function useEquipmentVendorsQuery(enabled: boolean) {
  return useQuery({
    queryKey: equipmentVendorsKey(),
    queryFn: fetchVendors,
    enabled,
    staleTime: 60_000,
  });
}

export function useEquipmentDetailQuery(id: number | null) {
  return useQuery({
    queryKey: equipmentDetailKey(id ?? 0),
    queryFn: async () => {
      if (id == null || !Number.isFinite(id) || id <= 0) {
        throw new Error('equipment id requerido');
      }
      return fetchDetail(id);
    },
    enabled: id != null && Number.isFinite(id) && id > 0,
    staleTime: 15_000,
  });
}

export function useInvalidateEquipment() {
  const qc = useQueryClient();
  return {
    invalidateAll: () => qc.invalidateQueries({ queryKey: equipmentRootKey }),
    invalidateInventory: () =>
      qc.invalidateQueries({ queryKey: [...equipmentRootKey, 'inventory'] }),
    invalidateMeta: () => {
      void qc.invalidateQueries({ queryKey: equipmentZonesKey() });
      void qc.invalidateQueries({ queryKey: equipmentCatalogKey() });
      void qc.invalidateQueries({ queryKey: equipmentVendorsKey() });
    },
    invalidateDetail: (id: number) => qc.invalidateQueries({ queryKey: equipmentDetailKey(id) }),
  };
}

export function useCreateEquipmentMutation() {
  const { invalidateInventory } = useInvalidateEquipment();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await apiFetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return parseJsonResponse<EquipmentItem>(response);
    },
    onSuccess: () => invalidateInventory(),
  });
}

export function useUpdateEquipmentMutation() {
  const { invalidateInventory, invalidateDetail } = useInvalidateEquipment();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Record<string, unknown> }) => {
      const response = await apiFetch(`/api/equipment/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return parseJsonResponse<EquipmentItem>(response);
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([invalidateInventory(), invalidateDetail(variables.id)]);
    },
  });
}

export function useDeleteEquipmentMutation() {
  const queryClient = useQueryClient();
  const { invalidateInventory } = useInvalidateEquipment();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiFetch(`/api/equipment/${id}`, { method: 'DELETE' });
      return parseJsonResponse(response);
    },
    onSuccess: async (_data, id) => {
      queryClient.removeQueries({ queryKey: equipmentDetailKey(id) });
      await invalidateInventory();
    },
  });
}

export function useCreateEquipmentEventMutation() {
  const { invalidateInventory, invalidateDetail } = useInvalidateEquipment();
  return useMutation({
    mutationFn: async ({
      equipmentId,
      payload,
    }: {
      equipmentId: number;
      payload: Record<string, unknown>;
    }) => {
      const response = await apiFetch(`/api/equipment/${equipmentId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return parseJsonResponse<MaintenanceEvent>(response);
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([invalidateInventory(), invalidateDetail(variables.equipmentId)]);
    },
  });
}
