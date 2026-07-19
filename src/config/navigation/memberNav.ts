import {
  LayoutDashboard,
  Dumbbell,
  BookOpen,
  UtensilsCrossed,
  History,
  CreditCard,
  MessageSquare,
  UserCircle,
  CalendarDays,
} from 'lucide-react';
import type { NavSection } from './types';

export const MEMBER_NAV: NavSection[] = [
  {
    name: 'Mi entrenamiento',
    items: [
      { name: 'Inicio', href: '/panel', icon: LayoutDashboard },
      { name: 'Rutinas', href: '/routines', icon: Dumbbell },
      { name: 'Nutrición', href: '/nutrition', icon: UtensilsCrossed },
      { name: 'Mensajes', href: '/messages', icon: MessageSquare },
      { name: 'Reservas', href: '/reservas', icon: CalendarDays },
      { name: 'Biblioteca', href: '/exercises', icon: BookOpen },
      { name: 'Historial', href: '/history', icon: History },
    ],
  },
  {
    name: 'Cuenta',
    items: [
      { name: 'Pagos', href: '/payments', icon: CreditCard },
      { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
    ],
  },
];
