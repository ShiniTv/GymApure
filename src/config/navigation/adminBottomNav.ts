import {
  LayoutDashboard,
  Users,
  CreditCard,
  MessageSquare,
  LayoutGrid,
  BadgeDollarSign,
  UserCog,
  BarChart2,
  Settings2,
  UserCircle,
  Wrench,
  CalendarDays,
} from 'lucide-react';
import type { StaffBottomNavMoreItem, StaffBottomNavTab } from './bottomNavTypes';

export const ADMIN_PRIMARY_TABS: StaffBottomNavTab[] = [
  { name: 'Panel', href: '/panel', icon: LayoutDashboard },
  { name: 'Miembros', href: '/members', icon: Users },
  { name: 'Pagos', href: '/payments', icon: CreditCard },
  { name: 'Mensajes', href: '/messages', icon: MessageSquare, showUnreadBadge: true },
  { name: 'Más', href: '__more__', icon: LayoutGrid, action: 'more' },
];

export const ADMIN_MORE_ITEMS: StaffBottomNavMoreItem[] = [
  { name: 'Membresías', href: '/memberships', icon: BadgeDollarSign },
  { name: 'Entrenadores', href: '/trainers', icon: UserCog },
  { name: 'Clases', href: '/clases', icon: CalendarDays },
  { name: 'Asistencias', href: '/attendance', icon: BarChart2 },
  { name: 'Equipamiento', href: '/equipment', icon: Wrench },
  { name: 'Configuración', href: '/settings', icon: Settings2 },
  { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
];

export function isAdminBottomNavActive(pathname: string, _search: string, href: string): boolean {
  if (href === '/panel') return pathname === '/panel';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isAdminMoreItemActive(pathname: string, _search: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isAdminMoreTabActive(pathname: string, search: string): boolean {
  return ADMIN_MORE_ITEMS.some((item) => isAdminMoreItemActive(pathname, search, item.href));
}
