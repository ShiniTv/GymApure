import { useCallback, useState } from 'react';
import { StaffBottomNav } from '../navigation/StaffBottomNav';
import {
  ADMIN_PRIMARY_TABS,
  ADMIN_MORE_ITEMS,
  isAdminBottomNavActive,
  isAdminMoreItemActive,
  isAdminMoreTabActive,
} from '../../config/navigation/adminBottomNav';
import type { StaffBottomNavTab } from '../../config/navigation/bottomNavTypes';
import { readAdminFavorites, toggleAdminFavorite } from '../../lib/adminFavorites';

export function AdminBottomNav() {
  const [favoriteHrefs, setFavoriteHrefs] = useState(() => readAdminFavorites());

  const onToggleFavorite = useCallback((href: string) => {
    setFavoriteHrefs(toggleAdminFavorite(href));
  }, []);

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
      favoriteHrefs={favoriteHrefs}
      onToggleFavorite={onToggleFavorite}
    />
  );
}
