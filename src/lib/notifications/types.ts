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
  };
}

export function notificationItemWeight(item: NotificationItem): number {
  return item.count ?? 1;
}

export function formatNotificationBadgeCount(total: number): string | null {
  if (total <= 0) return null;
  if (total > 99) return '99+';
  return String(total);
}
