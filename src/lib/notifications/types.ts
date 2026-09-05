export type NotificationSeverity = 'info' | 'warning' | 'critical';

export type NotificationSource = 'persisted' | 'live';

export interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  href: string;
  count?: number;
  severity?: NotificationSeverity;
  source?: NotificationSource;
  notificationId?: number;
  readAt?: string | null;
  createdAt?: string;
  /** Persisted notification type for grouping */
  type?: string;
}

export interface PersistedNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  href: string;
  severity: NotificationSeverity;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface NotificationsListResponse {
  items: PersistedNotification[];
  total: number;
  page: number;
  limit: number;
}

export function mapPersistedToItem(row: PersistedNotification): NotificationItem {
  return {
    id: `persisted-${row.id}`,
    notificationId: row.id,
    source: 'persisted',
    title: row.title,
    description: row.body,
    href: row.href,
    severity: row.severity,
    readAt: row.read_at,
    createdAt: row.created_at,
    count: 1,
    type: row.type,
  };
}

const TYPE_GROUP_LABELS: Record<string, string> = {
  payment_reported: 'Pagos reportados',
  payment_approved: 'Pagos aprobados',
  payment_rejected: 'Pagos rechazados',
  routine_assigned: 'Rutinas',
  member_self_assigned: 'Clientes · plantillas',
  member_created_routine: 'Clientes · rutinas propias',
  member_exercise_substituted: 'Clientes · sustituciones',
  expiring_soon: 'Membresías por vencer',
  expired: 'Membresías vencidas',
  equipment_inspection: 'Equipamiento',
  appointment_reminder: 'Citas',
  training_block_review: 'Bloques de entrenamiento',
};

export function notificationTypeGroupLabel(type: string | undefined): string {
  if (!type) return 'Otros';
  return TYPE_GROUP_LABELS[type] ?? 'Otros';
}

export function notificationItemWeight(item: NotificationItem): number {
  return item.count ?? 1;
}

export function formatNotificationBadgeCount(total: number): string | null {
  if (total <= 0) return null;
  if (total > 99) return '99+';
  return String(total);
}
