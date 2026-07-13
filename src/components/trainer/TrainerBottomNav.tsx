import { StaffBottomNav } from '../navigation/StaffBottomNav';
import {
  TRAINER_PRIMARY_TABS,
  TRAINER_MORE_ITEMS,
  isTrainerBottomNavActive,
  isTrainerMoreItemActive,
  isTrainerMoreTabActive,
} from '../../config/navigation/trainerBottomNav';
import type { StaffBottomNavTab } from '../../config/navigation/bottomNavTypes';

export function TrainerBottomNav() {
  return (
    <StaffBottomNav
      ariaLabel="Navegación entrenador"
      primaryTabs={TRAINER_PRIMARY_TABS}
      moreItems={TRAINER_MORE_ITEMS}
      navStackVar="--trainer-nav-stack"
      isPrimaryTabActive={(pathname, search, tab: StaffBottomNavTab) =>
        isTrainerBottomNavActive(pathname, search, tab.href)
      }
      isMoreItemActive={isTrainerMoreItemActive}
      isMoreTabActive={isTrainerMoreTabActive}
    />
  );
}
