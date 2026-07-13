import { useMediaQuery } from '../lib/useMediaQuery';

/** Shared breakpoint tokens — align JS hooks with Tailwind lg (1024px). */
export const BREAKPOINTS = {
  mobileMax: 767,
  tabletMax: 1023,
  desktopMin: 1024,
} as const;

export const MEDIA_QUERIES = {
  mobile: `(max-width: ${BREAKPOINTS.mobileMax}px)`,
  belowDesktop: `(max-width: ${BREAKPOINTS.tabletMax}px)`,
  desktop: `(min-width: ${BREAKPOINTS.desktopMin}px)`,
} as const;

export function useBreakpoint() {
  const isMobile = useMediaQuery(MEDIA_QUERIES.mobile);
  const isBelowDesktop = useMediaQuery(MEDIA_QUERIES.belowDesktop);
  const isDesktop = useMediaQuery(MEDIA_QUERIES.desktop);

  return {
    isMobile,
    isTablet: isBelowDesktop && !isMobile,
    isBelowDesktop,
    isDesktop,
    /** Matches mobile shell (bottom nav, drawer) — use instead of raw 1023px queries. */
    isMobileShell: isBelowDesktop,
  };
}
