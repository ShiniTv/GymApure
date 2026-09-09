import { CreditCard, Fingerprint, Ticket, UserPlus, Users } from 'lucide-react';
import type { ReceptionTab } from './types';

/** Touch-friendly counter inputs — compact on mobile */
export const COUNTER_FIELD =
  'min-h-12 h-12 text-base font-semibold tracking-wide sm:min-h-[52px] sm:h-[52px] sm:text-lg';
/** @deprecated Prefer Button size="lg" on counter CTAs — height escapes are stripped. */
export const COUNTER_ACTION = '';
export const COUNTER_SEARCH_BTN = 'shrink-0 p-0';

export const COUNTER_PRIMARY_TABS: {
  value: ReceptionTab;
  label: string;
  icon: typeof Fingerprint;
}[] = [
  { value: 'access', label: 'Acceso', icon: Fingerprint },
  { value: 'inside', label: 'Dentro', icon: Users },
];

export const COUNTER_SECONDARY_TABS: {
  value: ReceptionTab;
  label: string;
  icon: typeof UserPlus;
}[] = [
  { value: 'register', label: 'Registro', icon: UserPlus },
  { value: 'renew', label: 'Renovar', icon: CreditCard },
  { value: 'guests', label: 'Invitados', icon: Ticket },
];
