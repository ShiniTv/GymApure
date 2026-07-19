import {
  LayoutDashboard,
  Users,
  Dumbbell,
  MessageSquare,
  LayoutGrid,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  BookOpen,
  UserCircle,
  Wrench,
  UtensilsCrossed,
  ShieldCheck,
} from 'lucide-react';
import type { StaffBottomNavMoreItem, StaffBottomNavTab } from './bottomNavTypes';

export const TRAINER_PRIMARY_TABS: StaffBottomNavTab[] = [
  { name: 'Panel', href: '/panel', icon: LayoutDashboard },
  { name: 'Miembros', href: '/members', icon: Users },
  { name: 'Rutinas', href: '/routines', icon: Dumbbell },
  { name: 'Mensajes', href: '/messages', icon: MessageSquare, showUnreadBadge: true },
  { name: 'Más', href: '__more__', icon: LayoutGrid, action: 'more' },
];

/** Sheet items — synced with secondary items in trainerNav.ts */
export const TRAINER_MORE_ITEMS: StaffBottomNavMoreItem[] = [
  { name: 'Planes nutricionales', href: '/members?focus=nutrition', icon: UtensilsCrossed },
  { name: 'Asignaciones de rutinas', href: '/routines?view=assignments', icon: CalendarClock },
  { name: 'Calendario de rutinas', href: '/routines?view=calendar', icon: CalendarDays },
  { name: 'Clases grupales', href: '/clases', icon: CalendarRange },
  { name: 'Ejercicios', href: '/exercises', icon: BookOpen },
  { name: 'Equipamiento', href: '/equipment', icon: Wrench },
  { name: 'Seguridad MFA', href: '/security', icon: ShieldCheck },
  { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
];

export function isTrainerBottomNavActive(pathname: string, _search: string, href: string): boolean {
  if (href === '/panel') return pathname === '/panel';
  if (href === '/routines') {
    return pathname === '/routines' || pathname.startsWith('/routines/');
  }
  const path = href.split('?')[0];
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function isTrainerMoreItemActive(pathname: string, search: string, href: string): boolean {
  const [path, query = ''] = href.split('?');
  if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;
  if (!query) {
    // Bare /members should not match /members?focus=nutrition
    if (path === '/members') {
      const current = new URLSearchParams(search);
      return !current.get('focus');
    }
    return true;
  }
  const expected = new URLSearchParams(query);
  const current = new URLSearchParams(search);
  for (const [key, value] of expected.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

/** Routes covered by primary tabs — should not highlight the "Más" tab */
export function isTrainerMoreTabActive(pathname: string, search: string): boolean {
  return TRAINER_MORE_ITEMS.some((item) => {
    if (item.href.startsWith('/routines')) return false;
    return isTrainerMoreItemActive(pathname, search, item.href);
  });
}
