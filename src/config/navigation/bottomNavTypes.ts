import type { LucideIcon } from 'lucide-react';

export interface StaffBottomNavTab {
  name: string;
  href: string;
  icon: LucideIcon;
  showUnreadBadge?: boolean;
  action?: 'more';
}

export interface StaffBottomNavMoreItem {
  name: string;
  href: string;
  icon: LucideIcon;
  showUnreadBadge?: boolean;
  /** Unread system notifications badge (bell /notifications). */
  showNotificationBadge?: boolean;
  /** Numeric badge (e.g. cobros PT por confirmar). */
  badgeCount?: number;
  /** Optional section label; renders a header when it changes from the previous item */
  section?: string;
}
