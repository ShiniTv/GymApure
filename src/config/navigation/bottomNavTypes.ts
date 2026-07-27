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
  /** Numeric badge (e.g. cobros PT por confirmar). */
  badgeCount?: number;
  /** Optional section label; renders a header when it changes from the previous item */
  section?: string;
}
