import { Fingerprint, LogIn, Users, CreditCard, MessageSquare, UserCircle } from 'lucide-react';
import type { NavSection } from './types';

export const RECEPTION_NAV: NavSection[] = [
  {
    name: 'Mostrador',
    items: [
      { name: 'Inicio', href: '/reception', icon: Fingerprint },
      { name: 'Check-in', href: '/reception?mode=counter&tab=access', icon: LogIn },
    ],
  },
  {
    name: 'Operaciones',
    items: [
      { name: 'Miembros', href: '/members', icon: Users },
      { name: 'Pagos', href: '/payments', icon: CreditCard },
      { name: 'Mensajes', href: '/messages', icon: MessageSquare },
    ],
  },
  {
    name: 'Cuenta',
    items: [{ name: 'Mi Perfil', href: '/profile', icon: UserCircle }],
  },
];
