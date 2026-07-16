import {
  LayoutDashboard,
  Users,
  Dumbbell,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  BookOpen,
  MessageSquare,
  UserCircle,
  Wrench,
  UtensilsCrossed,
} from 'lucide-react';
import type { NavSection } from './types';

export const TRAINER_NAV: NavSection[] = [
  {
    name: 'Inicio',
    items: [{ name: 'Panel', href: '/panel', icon: LayoutDashboard }],
  },
  {
    name: 'Mis miembros',
    items: [
      { name: 'Miembros', href: '/members', icon: Users },
      { name: 'Planes nutricionales', href: '/members?focus=nutrition', icon: UtensilsCrossed },
    ],
  },
  {
    name: 'Programación',
    items: [
      { name: 'Rutinas', href: '/routines', icon: Dumbbell },
      { name: 'Asignaciones de rutinas', href: '/routines?view=assignments', icon: CalendarClock },
      { name: 'Calendario de rutinas', href: '/routines?view=calendar', icon: CalendarDays },
      { name: 'Clases grupales', href: '/clases', icon: CalendarRange },
    ],
  },
  {
    name: 'Contenido',
    items: [
      { name: 'Ejercicios', href: '/exercises', icon: BookOpen },
      { name: 'Equipamiento', href: '/equipment', icon: Wrench },
    ],
  },
  {
    name: 'Cuenta',
    items: [
      { name: 'Mensajes', href: '/messages', icon: MessageSquare },
      { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
    ],
  },
];
