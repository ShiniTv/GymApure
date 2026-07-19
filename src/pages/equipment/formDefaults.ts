import type { EquipmentStatus } from '../../lib/equipment/constants';
import type { EquipmentFormState, RepairFormState } from './types';

export const STATUS_BORDER_STYLES: Record<EquipmentStatus, string> = {
  operational: 'border-l-emerald-500',
  limited: 'border-l-orange-500',
  maintenance: 'border-l-brand',
  out_of_service: 'border-l-red-500',
};

export const STATUS_SHORT_LABELS: Record<EquipmentStatus, string> = {
  operational: 'OK',
  limited: 'Limit.',
  maintenance: 'Mant.',
  out_of_service: 'Fuera',
};

export const emptyEquipmentForm: EquipmentFormState = {
  catalog_id: '',
  custom_name: '',
  zone_id: '',
  status: 'operational',
  brand: '',
  model: '',
  serial_number: '',
  quantity: '1',
  notes: '',
  next_inspection_at: '',
};

export const emptyRepairForm: RepairFormState = {
  description: '',
  vendor_id: '',
  cost_usd: '',
  performed_at: '',
  new_status: '',
};

export function isInspectionDue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const due = new Date(dateStr);
  due.setHours(23, 59, 59, 999);
  return due.getTime() <= Date.now();
}
