import {
  LayoutDashboard,
  Users,
  Dumbbell,
  BookOpen,
  MessageSquare,
  UserCircle,
  Wrench,
  UtensilsCrossed,
  ShieldCheck,
  Landmark,
  CalendarDays,
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
      { name: 'Nutrición', href: '/nutrition-overview', icon: UtensilsCrossed },
      { name: 'Cobros PT', href: '/pt-billing', icon: Landmark },
    ],
  },
  {
    name: 'Programación',
    items: [
      { name: 'Rutinas', href: '/routines', icon: Dumbbell },
      { name: 'Calendario', href: '/routines?view=calendar', icon: CalendarDays },
    ],
  },
  {
    name: 'Contenido',
    items: [
      { name: 'Ejercicios', href: '/exercises', icon: BookOpen },
      { name: 'Reportar equipo', href: '/equipment', icon: Wrench },
    ],
  },
  {
    name: 'Cuenta',
    items: [
      { name: 'Mensajes', href: '/messages', icon: MessageSquare },
      { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
      { name: 'Seguridad MFA', href: '/security', icon: ShieldCheck },
    ],
  },
];
