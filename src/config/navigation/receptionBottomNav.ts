import type { LucideIcon } from 'lucide-react';
import {
  Fingerprint,
  Users,
  CreditCard,
  MessageSquare,
  LayoutGrid,
  LogIn,
  UserCircle,
} from 'lucide-react';

export interface ReceptionBottomTab {
  name: string;
  href: string;
  icon: LucideIcon;
  showUnreadBadge?: boolean;
  action?: 'more';
}

export interface ReceptionMoreItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

/** Primary tabs for reception mobile bottom nav */
export const RECEPTION_PRIMARY_TABS: ReceptionBottomTab[] = [
  { name: 'Inicio', href: '/reception', icon: Fingerprint },
  { name: 'Miembros', href: '/members', icon: Users },
  { name: 'Pagos', href: '/payments', icon: CreditCard },
  { name: 'Mensajes', href: '/messages', icon: MessageSquare, showUnreadBadge: true },
  { name: 'Más', href: '__more__', icon: LayoutGrid, action: 'more' },
];

export const RECEPTION_MORE_ITEMS: ReceptionMoreItem[] = [
  { name: 'Modo tablet / Check-in', href: '/check-in?kiosk=1', icon: LogIn },
  { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
];

export function isReceptionBottomNavActive(pathname: string, href: string): boolean {
  if (href === '/reception') {
    return pathname === '/reception' || pathname.startsWith('/reception/');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
