import { StaffBottomNav } from '../navigation/StaffBottomNav';
import {
  ADMIN_PRIMARY_TABS,
  ADMIN_MORE_ITEMS,
  isAdminBottomNavActive,
  isAdminMoreItemActive,
  isAdminMoreTabActive,
} from '../../config/navigation/adminBottomNav';
import type { StaffBottomNavTab } from '../../config/navigation/bottomNavTypes';

export function AdminBottomNav() {
  return (
    <StaffBottomNav
      ariaLabel="Navegación administrador"
      primaryTabs={ADMIN_PRIMARY_TABS}
      moreItems={ADMIN_MORE_ITEMS}
      navStackVar="--admin-nav-stack"
      isPrimaryTabActive={(pathname, search, tab: StaffBottomNavTab) =>
        isAdminBottomNavActive(pathname, search, tab.href)
      }
      isMoreItemActive={isAdminMoreItemActive}
      isMoreTabActive={isAdminMoreTabActive}
    />
  );
}
