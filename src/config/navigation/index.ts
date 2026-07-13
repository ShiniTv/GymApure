import { ADMIN_NAV } from './adminNav';
import { TRAINER_NAV } from './trainerNav';
import { MEMBER_NAV } from './memberNav';
import { RECEPTION_NAV } from './receptionNav';
import type { NavSection } from './types';

export type { NavItem, NavSection } from './types';

export function getNavigationForRole(role: string): NavSection[] {
  switch (role) {
    case 'admin':
      return ADMIN_NAV;
    case 'trainer':
      return TRAINER_NAV;
    case 'member':
      return MEMBER_NAV;
    case 'receptionist':
      return RECEPTION_NAV;
    default:
      return MEMBER_NAV;
  }
}
