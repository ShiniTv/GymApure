import {
  LayoutDashboard,
  Users,
  Dumbbell,
  CalendarClock,
  CalendarDays,
  BookOpen,
  MessageSquare,
  UserCircle,
} from 'lucide-react';
import type { NavSection } from './types';

export const TRAINER_NAV: NavSection[] = [
  {
    name: 'Inicio',
    items: [{ name: 'Panel', href: '/', icon: LayoutDashboard }],
  },
  {
    name: 'Mis miembros',
    items: [{ name: 'Miembros', href: '/members', icon: Users }],
  },
  {
    name: 'Programación',
    items: [
      { name: 'Rutinas', href: '/routines', icon: Dumbbell },
      { name: 'Asignaciones', href: '/routines?view=assignments', icon: CalendarClock },
      { name: 'Calendario', href: '/routines?view=calendar', icon: CalendarDays },
    ],
  },
  {
    name: 'Contenido',
    items: [{ name: 'Ejercicios', href: '/exercises', icon: BookOpen }],
  },
  {
    name: 'Cuenta',
    items: [
      { name: 'Mensajes', href: '/messages', icon: MessageSquare },
      { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
    ],
  },
];
