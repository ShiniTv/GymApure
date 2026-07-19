import type { EquipmentCategory, EquipmentStatus } from '../../lib/equipment/constants';

export interface Zone {
  id: number;
  name: string;
  sort_order: number;
}

export interface CatalogItem {
  id: number;
  name: string;
  category: EquipmentCategory;
  description?: string | null;
  typical_brands?: string | null;
  is_system: boolean;
}

export interface Vendor {
  id: number;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface EquipmentBootstrap {
  zones: Zone[];
  catalog: CatalogItem[];
  vendors: Vendor[];
  stats: {
    operational: number;
    limited: number;
    maintenance: number;
    outOfService: number;
    inspectionsDueThisWeek: number;
  };
  inventory: EquipmentItem[];
}

export interface EquipmentItem {
  id: number;
  catalog_id?: number | null;
  catalog_name?: string | null;
  catalog_category?: EquipmentCategory | null;
  custom_name?: string | null;
  zone_id?: number | null;
  zone_name?: string | null;
  status: EquipmentStatus;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  quantity: number;
  notes?: string | null;
  photo_url?: string | null;
  next_inspection_at?: string | null;
  warranty_until?: string | null;
}

export interface MaintenanceEvent {
  id: number;
  event_type: string;
  description: string;
  previous_status?: string | null;
  new_status?: string | null;
  performed_at: string;
  created_by_name?: string | null;
  vendor_name?: string | null;
  cost_usd?: number | null;
}

export type AddStep = 'pick' | 'details';
export type ConfigTab = 'zones' | 'vendors';
export type LayoutView = 'flat' | 'zones';

export interface EquipmentFormState {
  catalog_id: string;
  custom_name: string;
  zone_id: string;
  status: EquipmentStatus;
  brand: string;
  model: string;
  serial_number: string;
  quantity: string;
  notes: string;
  next_inspection_at: string;
}

export interface RepairFormState {
  description: string;
  vendor_id: string;
  cost_usd: string;
  performed_at: string;
  new_status: EquipmentStatus | '';
}
