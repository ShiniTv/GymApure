import { createContext, useContext, type ReactNode } from 'react';

interface MobileShellContextValue {
  /** Ocultar BackToDashboardLink cuando la bottom nav ya cubre inicio */
  hideBackToDashboard: boolean;
}

const MobileShellContext = createContext<MobileShellContextValue>({
  hideBackToDashboard: false,
});

export function MobileShellProvider({
  hideBackToDashboard,
  children,
}: {
  hideBackToDashboard: boolean;
  children: ReactNode;
}) {
  return (
    <MobileShellContext.Provider value={{ hideBackToDashboard }}>
      {children}
    </MobileShellContext.Provider>
  );
}

export function useMobileShell() {
  return useContext(MobileShellContext);
}
