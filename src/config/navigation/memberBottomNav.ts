import type { LucideIcon } from 'lucide-react';
import {
  Home,
  ListChecks,
  UtensilsCrossed,
  LayoutGrid,
  BookOpen,
  MessageSquare,
  History,
  CreditCard,
  UserCircle,
} from 'lucide-react';

export interface MemberBottomTab {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Internal action instead of route navigation */
  action?: 'more';
}

export interface MemberMoreItem {
  name: string;
  href: string;
  icon: LucideIcon;
  showUnreadBadge?: boolean;
}

/** Primary tabs in the floating pill (mobile member). */
export const MEMBER_PRIMARY_TABS: MemberBottomTab[] = [
  { name: 'Inicio', href: '/', icon: Home },
  { name: 'Rutinas', href: '/routines', icon: ListChecks },
  { name: 'Nutrición', href: '/nutrition', icon: UtensilsCrossed },
  { name: 'Más', href: '__more__', icon: LayoutGrid, action: 'more' },
];

/** Sheet items — synced with secondary items in memberNav.ts */
export const MEMBER_MORE_ITEMS: MemberMoreItem[] = [
  { name: 'Biblioteca', href: '/exercises', icon: BookOpen },
  { name: 'Mensajes', href: '/messages', icon: MessageSquare, showUnreadBadge: true },
  { name: 'Historial', href: '/history', icon: History },
  { name: 'Pagos', href: '/payments', icon: CreditCard },
  { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
];

/** Routes where the contextual workout FAB is shown */
export const MEMBER_FAB_ROUTES = ['/', '/routines', '/exercises'] as const;

export function isMemberFabRoute(pathname: string): boolean {
  return MEMBER_FAB_ROUTES.some(
    (route) => pathname === route || (route !== '/' && pathname.startsWith(`${route}/`))
  );
}

/** Immersive routes where the floating bottom nav must be hidden */
export function shouldHideMemberBottomNav(pathname: string): boolean {
  return pathname.startsWith('/workout/');
}
