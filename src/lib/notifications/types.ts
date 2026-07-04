export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  href: string;
  count?: number;
  severity?: NotificationSeverity;
}

export function notificationItemWeight(item: NotificationItem): number {
  return item.count ?? 1;
}

export function formatNotificationBadgeCount(total: number): string | null {
  if (total <= 0) return null;
  return total > 9 ? '9+' : String(total);
}
