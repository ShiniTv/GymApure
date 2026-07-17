import {
  Fingerprint,
  LogIn,
  Users,
  CreditCard,
  MessageSquare,
  UserCircle,
  Wrench,
  CalendarDays,
  ShieldCheck,
} from 'lucide-react';
import type { NavSection } from './types';

export const RECEPTION_NAV: NavSection[] = [
  {
    name: 'Mostrador',
    items: [
      { name: 'Inicio', href: '/reception', icon: Fingerprint },
      { name: 'Mostrador', href: '/reception?mode=counter&tab=access', icon: LogIn },
      { name: 'Clases del día', href: '/clases', icon: CalendarDays },
    ],
  },
  {
    name: 'Operaciones',
    items: [
      { name: 'Miembros', href: '/members', icon: Users },
      { name: 'Equipamiento', href: '/equipment', icon: Wrench },
      { name: 'Pagos', href: '/payments', icon: CreditCard },
      { name: 'Mensajes', href: '/messages', icon: MessageSquare },
    ],
  },
  {
    name: 'Cuenta',
    items: [
      { name: 'Mi Perfil', href: '/profile', icon: UserCircle },
      { name: 'Seguridad MFA', href: '/security', icon: ShieldCheck },
    ],
  },
];
