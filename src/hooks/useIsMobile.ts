import { useEffect, useState } from 'react';
import { MEDIA_QUERIES } from './useBreakpoint';

/** True when viewport width ≤ 767px (phone). For shell/table layouts use useBreakpoint().isMobileShell. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MEDIA_QUERIES.mobile).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(MEDIA_QUERIES.mobile);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
