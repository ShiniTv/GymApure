import { useMemo } from 'react';
import { StaffBottomNav } from '../navigation/StaffBottomNav';
import { useAuth } from '../../context/AuthContext';
import {
  TRAINER_PRIMARY_TABS,
  TRAINER_MORE_ITEMS,
  isTrainerBottomNavActive,
  isTrainerMoreItemActive,
  isTrainerMoreTabActive,
} from '../../config/navigation/trainerBottomNav';
import type { StaffBottomNavTab } from '../../config/navigation/bottomNavTypes';
import { useTrainerInvoicesQuery } from '../../hooks/queries/useTrainerBillingQuery';

export function TrainerBottomNav() {
  const { user } = useAuth();
  const firstName = user?.name ? user.name.split(/\s+/)[0] : 'entrenador';
  const { data: invoices = [] } = useTrainerInvoicesQuery(true);
  const ptConfirmCount = useMemo(
    () => invoices.filter((inv) => inv.status === 'pending' && Boolean(inv.reference)).length,
    [invoices]
  );

  const moreItems = useMemo(
    () =>
      TRAINER_MORE_ITEMS.map((item) =>
        item.href === '/pt-billing' && ptConfirmCount > 0
          ? { ...item, badgeCount: ptConfirmCount }
          : item
      ),
    [ptConfirmCount]
  );

  return (
    <StaffBottomNav
      ariaLabel="Navegación entrenador"
      primaryTabs={TRAINER_PRIMARY_TABS}
      moreItems={moreItems}
      navStackVar="--trainer-nav-stack"
      isPrimaryTabActive={(pathname, search, tab: StaffBottomNavTab) =>
        isTrainerBottomNavActive(pathname, search, tab.href)
      }
      isMoreItemActive={isTrainerMoreItemActive}
      isMoreTabActive={isTrainerMoreTabActive}
      greetingName={firstName}
      greetingSubtitle="Portal entrenador"
    />
  );
}
