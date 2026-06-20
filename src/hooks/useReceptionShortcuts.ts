import { useEffect } from 'react';

interface ReceptionShortcutsOptions {
  enabled: boolean;
  onSearch: () => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
  canCheckIn: boolean;
  canCheckOut: boolean;
}

export function useReceptionShortcuts({
  enabled,
  onSearch,
  onCheckIn,
  onCheckOut,
  canCheckIn,
  canCheckOut,
}: ReceptionShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'F1') {
        e.preventDefault();
        if (canCheckIn) onCheckIn();
        return;
      }
      if (e.key === 'F2') {
        e.preventDefault();
        if (canCheckOut) onCheckOut();
        return;
      }
      if (e.key === 'Enter' && isInput) {
        e.preventDefault();
        onSearch();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onSearch, onCheckIn, onCheckOut, canCheckIn, canCheckOut]);
}
