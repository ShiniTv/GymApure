export const EQUIPMENT_STATUSES = [
  'operational',
  'limited',
  'maintenance',
  'out_of_service',
] as const;

export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

export const EQUIPMENT_CATEGORIES = [
  'cardio',
  'strength',
  'functional',
  'infrastructure',
  'other',
] as const;

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

export const EQUIPMENT_EVENT_TYPES = ['report', 'inspection', 'repair', 'status_change'] as const;

export type EquipmentEventType = (typeof EQUIPMENT_EVENT_TYPES)[number];

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  operational: 'Operativa',
  limited: 'Limitada',
  maintenance: 'En mantenimiento',
  out_of_service: 'Fuera de servicio',
};

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  cardio: 'Cardio',
  strength: 'Fuerza',
  functional: 'Funcional',
  infrastructure: 'Infraestructura',
  other: 'Otro',
};

export const EQUIPMENT_EVENT_LABELS: Record<EquipmentEventType, string> = {
  report: 'Incidencia reportada',
  inspection: 'Inspección',
  repair: 'Reparación',
  status_change: 'Cambio de estado',
};

export const EQUIPMENT_STATUS_BADGE: Record<
  EquipmentStatus,
  'success' | 'warning' | 'accent' | 'danger'
> = {
  operational: 'success',
  limited: 'warning',
  maintenance: 'accent',
  out_of_service: 'danger',
};

export function equipmentDisplayName(row: {
  custom_name?: string | null;
  catalog_name?: string | null;
}): string {
  const custom = row.custom_name?.trim();
  if (custom) return custom;
  return row.catalog_name?.trim() || 'Equipo sin nombre';
}
