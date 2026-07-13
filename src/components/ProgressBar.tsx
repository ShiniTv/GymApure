import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Top-of-page navigation progress indicator.
 * Uses location changes instead of useNavigation(), which requires a data router in RR v7.
 */
export function ProgressBar() {
  const location = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const clearTimers = () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
      cancelAnimationFrame(rafRef.current);
    };

    clearTimers();

    el.style.width = '0%';
    el.style.opacity = '1';

    rafRef.current = requestAnimationFrame(() => {
      el.style.transition = 'width 0.35s cubic-bezier(0.1, 0.05, 0, 1)';
      el.style.width = '75%';

      timersRef.current.push(
        window.setTimeout(() => {
          el.style.transition = 'width 0.25s ease, opacity 0.25s ease';
          el.style.width = '100%';
          timersRef.current.push(
            window.setTimeout(() => {
              el.style.opacity = '0';
              el.style.transition = 'none';
              el.style.width = '0%';
            }, 250)
          );
        }, 120)
      );
    });

    return clearTimers;
  }, [location.pathname, location.search, location.key]);

  return (
    <div className="pointer-events-none fixed top-0 right-0 left-0 z-[100] h-[3px]">
      <div
        ref={ref}
        className="bg-brand h-full transition-none"
        style={{ width: '0%', opacity: '0' }}
        suppressHydrationWarning
      />
    </div>
  );
}
