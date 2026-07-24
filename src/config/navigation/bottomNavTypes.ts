import type { LucideIcon } from 'lucide-react';

export interface StaffBottomNavTab {
  name: string;
  href: string;
  icon: LucideIcon;
  showUnreadBadge?: boolean;
  showPendingPaymentsBadge?: boolean;
  action?: 'more';
}

export interface StaffBottomNavMoreItem {
  name: string;
  href: string;
  icon: LucideIcon;
  showUnreadBadge?: boolean;
  showPendingPaymentsBadge?: boolean;
  /** Optional section label; renders a header when it changes from the previous item */
  section?: string;
}
