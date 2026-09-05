import {
  Fingerprint,
  Users,
  CreditCard,
  MessageSquare,
  UserCircle,
  Wrench,
  ShieldCheck,
} from 'lucide-react';
import type { NavSection } from './types';

/** Single Acceso entry — counter is the daily home (no Inicio/Mostrador split). */
export const RECEPTION_NAV: NavSection[] = [
  {
    name: 'Acceso',
    items: [{ name: 'Acceso', href: '/reception?mode=counter&tab=access', icon: Fingerprint }],
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
