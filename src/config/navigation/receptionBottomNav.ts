import {
  Fingerprint,
  Users,
  CreditCard,
  MessageSquare,
  LayoutGrid,
  LogIn,
  UserCircle,
  Wrench,
  CalendarDays,
  ShieldCheck,
  LayoutDashboard,
} from 'lucide-react';
import type { StaffBottomNavMoreItem, StaffBottomNavTab } from './bottomNavTypes';

export type ReceptionBottomTab = StaffBottomNavTab;
export type ReceptionMoreItem = StaffBottomNavMoreItem;

export const RECEPTION_COUNTER_HREF = '/reception?mode=counter&tab=access';

/** Primary tabs for reception mobile bottom nav — Acceso is the daily #1 flow */
export const RECEPTION_PRIMARY_TABS: ReceptionBottomTab[] = [
  { name: 'Acceso', href: RECEPTION_COUNTER_HREF, icon: Fingerprint },
  { name: 'Miembros', href: '/members', icon: Users },
  { name: 'Pagos', href: '/payments', icon: CreditCard, showPendingPaymentsBadge: true },
  { name: 'Mensajes', href: '/messages', icon: MessageSquare, showUnreadBadge: true },
  { name: 'Más', href: '__more__', icon: LayoutGrid, action: 'more' },
];

export const RECEPTION_MORE_ITEMS: ReceptionMoreItem[] = [
  { name: 'Resumen', href: '/reception', icon: LayoutDashboard, section: 'Operación' },
  { name: 'Modo tablet', href: '/check-in?kiosk=1', icon: LogIn, section: 'Operación' },
  { name: 'Clases', href: '/clases', icon: CalendarDays, section: 'Operación' },
  { name: 'Equipamiento', href: '/equipment', icon: Wrench, section: 'Operación' },
  { name: 'Seguridad', href: '/security', icon: ShieldCheck, section: 'Cuenta' },
  { name: 'Mi Perfil', href: '/profile', icon: UserCircle, section: 'Cuenta' },
];

function hrefMatchesQuery(search: string, href: string): boolean {
  const query = href.includes('?') ? href.slice(href.indexOf('?') + 1) : '';
  if (!query) return true;
  const expected = new URLSearchParams(query);
  const current = new URLSearchParams(search);
  for (const [key, value] of expected.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

export function isReceptionBottomNavActive(
  pathname: string,
  search: string,
  href: string
): boolean {
  // Acceso covers both resumen and counter — daily home of the reception role
  if (href === RECEPTION_COUNTER_HREF || href.startsWith('/reception?mode=counter')) {
    return pathname === '/reception' || pathname.startsWith('/reception/');
  }
  if (href.includes('?')) {
    const path = href.split('?')[0];
    if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;
    return hrefMatchesQuery(search, href);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isReceptionMoreItemActive(pathname: string, search: string, href: string): boolean {
  if (href.includes('?')) {
    const path = href.split('?')[0];
    if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;
    return hrefMatchesQuery(search, href);
  }
  if (href === '/reception') {
    const mode = new URLSearchParams(search).get('mode');
    return pathname === '/reception' && mode !== 'counter';
  }
  const path = href.split('?')[0];
  return (
    pathname === path ||
    pathname.startsWith(`${path}/`) ||
    (path === '/check-in' && pathname === '/check-in')
  );
}

export function isReceptionMoreTabActive(pathname: string, search: string): boolean {
  return RECEPTION_MORE_ITEMS.some((item) => {
    // Resumen lives under Acceso in the primary pill; don't light Más on home
    if (item.href === '/reception') return false;
    return isReceptionMoreItemActive(pathname, search, item.href);
  });
}
