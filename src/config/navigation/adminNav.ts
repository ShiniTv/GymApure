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
} from 'lucide-react';
import type { NavSection } from './types';

export const ADMIN_NAV: NavSection[] = [
  {
    name: 'Resumen',
    items: [{ name: 'Panel', href: '/', icon: LayoutDashboard }],
  },
  {
    name: 'Gestión',
    items: [
      { name: 'Miembros', href: '/members', icon: Users },
      { name: 'Membresías', href: '/memberships', icon: CreditCard },
      { name: 'Entrenadores', href: '/trainers', icon: UserCog },
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
