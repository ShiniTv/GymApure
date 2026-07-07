import {
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_STATUS_LABELS,
  equipmentDisplayName,
  type EquipmentCategory,
  type EquipmentStatus,
} from './constants';

export interface EquipmentListItem {
  id: number;
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
}

export interface ZoneSummary {
  id: number;
  name: string;
  sort_order: number;
}

export interface EquipmentZoneGroup {
  zoneId: number | null;
  zoneName: string;
  sortOrder: number;
  items: EquipmentListItem[];
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function groupEquipmentByZone(
  items: EquipmentListItem[],
  zones: ZoneSummary[]
): EquipmentZoneGroup[] {
  const buckets = new Map<string, EquipmentListItem[]>();

  for (const item of items) {
    const key = item.zone_id != null ? String(item.zone_id) : '__none__';
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }

  const groups: EquipmentZoneGroup[] = [];

  for (const zone of zones) {
    const zoneItems = buckets.get(String(zone.id));
    if (!zoneItems?.length) continue;
    groups.push({
      zoneId: zone.id,
      zoneName: zone.name,
      sortOrder: zone.sort_order,
      items: zoneItems,
    });
    buckets.delete(String(zone.id));
  }

  const unzoned = buckets.get('__none__');
  if (unzoned?.length) {
    groups.push({
      zoneId: null,
      zoneName: 'Sin zona',
      sortOrder: 9999,
      items: unzoned,
    });
    buckets.delete('__none__');
  }

  for (const [key, zoneItems] of buckets) {
    if (!zoneItems.length) continue;
    const zoneId = Number(key);
    groups.push({
      zoneId,
      zoneName: zoneItems[0].zone_name ?? 'Zona',
      sortOrder: zones.find((z) => z.id === zoneId)?.sort_order ?? 5000,
      items: zoneItems,
    });
  }

  return groups;
}

export function downloadEquipmentCsv(items: EquipmentListItem[]): void {
  const headers = [
    'Nombre',
    'Zona',
    'Categoría',
    'Estado',
    'Marca',
    'Modelo',
    'Serie',
    'Cantidad',
    'Próxima inspección',
    'Notas',
  ];

  const rows = items.map((item) => [
    equipmentDisplayName(item),
    item.zone_name ?? '',
    item.catalog_category ? EQUIPMENT_CATEGORY_LABELS[item.catalog_category] : '',
    EQUIPMENT_STATUS_LABELS[item.status],
    item.brand ?? '',
    item.model ?? '',
    item.serial_number ?? '',
    String(item.quantity),
    item.next_inspection_at ?? '',
    item.notes ?? '',
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => csvEscape(String(cell))).join(','))
    .join('\r\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `equipamiento-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
