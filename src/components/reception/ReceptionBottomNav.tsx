import { StaffBottomNav } from '../navigation/StaffBottomNav';
import {
  RECEPTION_PRIMARY_TABS,
  RECEPTION_MORE_ITEMS,
  isReceptionBottomNavActive,
  isReceptionMoreItemActive,
  isReceptionMoreTabActive,
} from '../../config/navigation/receptionBottomNav';
import type { StaffBottomNavTab } from '../../config/navigation/bottomNavTypes';

export function ReceptionBottomNav() {
  return (
    <StaffBottomNav
      ariaLabel="Navegación recepción"
      primaryTabs={RECEPTION_PRIMARY_TABS}
      moreItems={RECEPTION_MORE_ITEMS}
      navStackVar="--reception-nav-stack"
      isPrimaryTabActive={(pathname, search, tab: StaffBottomNavTab) =>
        isReceptionBottomNavActive(pathname, search, tab.href)
      }
      isMoreItemActive={isReceptionMoreItemActive}
      isMoreTabActive={isReceptionMoreTabActive}
    />
  );
}
