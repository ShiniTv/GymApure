import {
  Fingerprint,
  Users,
  CreditCard,
  MessageSquare,
  LayoutGrid,
  LogIn,
  UserCircle,
  Wrench,
} from 'lucide-react';
import type { StaffBottomNavMoreItem, StaffBottomNavTab } from './bottomNavTypes';

export type ReceptionBottomTab = StaffBottomNavTab;
export type ReceptionMoreItem = StaffBottomNavMoreItem;

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
  { name: 'Equipamiento', href: '/equipment', icon: Wrench },
  { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
];

export function isReceptionBottomNavActive(
  pathname: string,
  _search: string,
  href: string
): boolean {
  if (href === '/reception') {
    return pathname === '/reception' || pathname.startsWith('/reception/');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isReceptionMoreItemActive(
  pathname: string,
  _search: string,
  href: string
): boolean {
  const path = href.split('?')[0];
  return (
    pathname === path ||
    pathname.startsWith(`${path}/`) ||
    (path === '/check-in' && pathname === '/check-in')
  );
}

export function isReceptionMoreTabActive(pathname: string, search: string): boolean {
  return RECEPTION_MORE_ITEMS.some((item) =>
    isReceptionMoreItemActive(pathname, search, item.href)
  );
}
