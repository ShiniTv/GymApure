import type { LucideIcon } from 'lucide-react';
import { Fingerprint, Users, CreditCard, MessageSquare } from 'lucide-react';

export interface ReceptionBottomTab {
  name: string;
  href: string;
  icon: LucideIcon;
  showUnreadBadge?: boolean;
}

/** Primary tabs for reception mobile bottom nav */
export const RECEPTION_PRIMARY_TABS: ReceptionBottomTab[] = [
  { name: 'Inicio', href: '/reception', icon: Fingerprint },
  { name: 'Miembros', href: '/members', icon: Users },
  { name: 'Pagos', href: '/payments', icon: CreditCard },
  { name: 'Mensajes', href: '/messages', icon: MessageSquare, showUnreadBadge: true },
];

export function isReceptionBottomNavActive(pathname: string, href: string): boolean {
  if (href === '/reception') {
    return pathname === '/reception' || pathname.startsWith('/reception/');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
