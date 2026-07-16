import {
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart2,
  FileSpreadsheet,
  ScrollText,
  MessageSquare,
  Settings2,
  UserCog,
  UserCircle,
  UtensilsCrossed,
  Wrench,
  BadgeDollarSign,
  CalendarDays,
} from 'lucide-react';
import type { NavSection } from './types';

export const ADMIN_NAV: NavSection[] = [
  {
    name: 'Resumen',
    items: [{ name: 'Panel', href: '/panel', icon: LayoutDashboard }],
  },
  {
    name: 'Gestión',
    items: [
      { name: 'Miembros', href: '/members', icon: Users },
      { name: 'Membresías', href: '/memberships', icon: BadgeDollarSign },
      { name: 'Entrenadores', href: '/trainers', icon: UserCog },
      { name: 'Clases', href: '/clases', icon: CalendarDays },
      { name: 'Equipamiento', href: '/equipment', icon: Wrench },
    ],
  },
  {
    name: 'Finanzas',
    items: [{ name: 'Pagos', href: '/payments', icon: CreditCard }],
  },
  {
    name: 'Supervisión',
    items: [
      { name: 'Asistencias', href: '/attendance', icon: BarChart2 },
      { name: 'Reportes', href: '/reports', icon: FileSpreadsheet },
      { name: 'Auditoría', href: '/audit-logs', icon: ScrollText },
      { name: 'Nutrición', href: '/nutrition-overview', icon: UtensilsCrossed },
      { name: 'Mensajes', href: '/messages', icon: MessageSquare },
    ],
  },
  {
    name: 'Cuenta',
    items: [
      { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
      { name: 'Configuración', href: '/settings', icon: Settings2 },
    ],
  },
];
