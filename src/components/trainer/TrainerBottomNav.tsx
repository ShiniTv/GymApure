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

export function TrainerBottomNav() {
  const { user } = useAuth();
  const firstName = user?.name?.split(/\s+/)[0] ?? 'entrenador';

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
      greetingName={firstName}
      greetingSubtitle="Portal entrenador"
    />
  );
}
