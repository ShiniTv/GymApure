import { useId } from 'react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

export function LandingBackground() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const noiseId = useId().replace(/:/g, '');

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className={cn(
          'landing-mesh motion-safe:animate-landing-mesh-drift absolute -inset-[20%]',
          isLight ? 'landing-mesh-light' : 'landing-mesh-dark'
        )}
      />
      <div
        className={cn(
          'absolute inset-0',
          isLight ? 'landing-dot-grid-light' : 'landing-dot-grid-dark'
        )}
      />
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.028] mix-blend-overlay dark:opacity-[0.035]"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <filter id={`landing-noise-${noiseId}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.75"
            numOctaves="4"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#landing-noise-${noiseId})`} />
      </svg>
    </div>
  );
}
