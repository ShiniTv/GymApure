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
  FileSpreadsheet,
  ScrollText,
  ShieldCheck,
  Fingerprint,
  LogIn,
  UsersRound,
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
  {
    name: 'Mostrador',
    href: '/reception?mode=counter&tab=access',
    icon: Fingerprint,
    section: 'Operación',
  },
  { name: 'Modo tablet', href: '/check-in?kiosk=1', icon: LogIn, section: 'Operación' },
  { name: 'Membresías', href: '/memberships', icon: BadgeDollarSign, section: 'Operación' },
  { name: 'Entrenadores', href: '/trainers', icon: UserCog, section: 'Operación' },
  { name: 'Clases', href: '/clases', icon: CalendarDays, section: 'Operación' },
  { name: 'Asistencias', href: '/attendance', icon: BarChart2, section: 'Operación' },
  { name: 'Equipamiento', href: '/equipment', icon: Wrench, section: 'Operación' },
  { name: 'Reportes', href: '/reports', icon: FileSpreadsheet, section: 'Finanzas' },
  { name: 'Auditoría', href: '/audit-logs', icon: ScrollText, section: 'Supervisión' },
  { name: 'Solicitudes demo', href: '/demo-leads', icon: UsersRound, section: 'Supervisión' },
  { name: 'Configuración', href: '/settings', icon: Settings2, section: 'Cuenta' },
  { name: 'Seguridad MFA', href: '/security', icon: ShieldCheck, section: 'Cuenta' },
  { name: 'Mi Perfil', href: '/profile', icon: UserCircle, section: 'Cuenta' },
];

export function isAdminBottomNavActive(pathname: string, _search: string, href: string): boolean {
  if (href === '/panel') return pathname === '/panel';
  if (href.includes('?')) {
    return pathname === href.split('?')[0];
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isAdminMoreItemActive(pathname: string, search: string, href: string): boolean {
  if (href.includes('?')) {
    const [path, query = ''] = href.split('?');
    if (pathname !== path) return false;
    if (!query) return true;
    const expected = new URLSearchParams(query);
    const current = new URLSearchParams(search);
    for (const [key, value] of expected.entries()) {
      if (current.get(key) !== value) return false;
    }
    return true;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isAdminMoreTabActive(pathname: string, search: string): boolean {
  return ADMIN_MORE_ITEMS.some((item) => isAdminMoreItemActive(pathname, search, item.href));
}
