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
  CalendarDays,
} from 'lucide-react';

export interface MemberBottomTab {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Internal action instead of route navigation */
  action?: 'more';
  showUnreadBadge?: boolean;
}

export interface MemberMoreItem {
  name: string;
  href: string;
  icon: LucideIcon;
  showUnreadBadge?: boolean;
  /** Group label in the Más sheet */
  section: 'Actividad' | 'Entreno' | 'Cuenta';
}

/** Primary tabs in the floating pill (mobile member). */
export const MEMBER_PRIMARY_TABS: MemberBottomTab[] = [
  { name: 'Inicio', href: '/panel', icon: Home },
  { name: 'Rutinas', href: '/routines', icon: ListChecks },
  { name: 'Nutrición', href: '/nutrition', icon: UtensilsCrossed },
  { name: 'Más', href: '__more__', icon: LayoutGrid, action: 'more' },
];

/** Sheet items — synced with secondary items in memberNav.ts */
export const MEMBER_MORE_ITEMS: MemberMoreItem[] = [
  {
    name: 'Mensajes',
    href: '/messages',
    icon: MessageSquare,
    showUnreadBadge: true,
    section: 'Actividad',
  },
  { name: 'Reservas', href: '/reservas', icon: CalendarDays, section: 'Actividad' },
  { name: 'Historial', href: '/history', icon: History, section: 'Actividad' },
  { name: 'Biblioteca', href: '/exercises', icon: BookOpen, section: 'Entreno' },
  { name: 'Pagos', href: '/payments', icon: CreditCard, section: 'Cuenta' },
  { name: 'Mi Perfil', href: '/profile', icon: UserCircle, section: 'Cuenta' },
];

/** Routes where the contextual workout FAB is shown (not Inicio — hero already has CTA). */
export const MEMBER_FAB_ROUTES = ['/routines', '/exercises', '/nutrition'] as const;

export function isMemberFabRoute(pathname: string): boolean {
  return MEMBER_FAB_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/** Immersive routes where the floating bottom nav must be hidden */
export function shouldHideMemberBottomNav(pathname: string): boolean {
  return pathname.startsWith('/workout/');
}
