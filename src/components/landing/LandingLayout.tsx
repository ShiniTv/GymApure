import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';
import { DynamicIslandNav } from './DynamicIslandNav';
import { LandingFooter } from './sections/LandingFooter';

interface LandingLayoutProps {
  children: ReactNode;
}

export function LandingLayout({ children }: LandingLayoutProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div
      className={cn(
        'relative min-h-dvh overflow-x-hidden text-zinc-900 transition-colors duration-300 dark:text-white',
        'to-brand/[0.05] bg-gradient-to-br from-zinc-50 via-zinc-50',
        'dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950'
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className={cn(
            'absolute top-[-10%] left-[-10%] rounded-full',
            isLight
              ? 'bg-brand/20 h-[45%] w-[45%] blur-[140px]'
              : 'bg-brand/10 h-[40%] w-[40%] blur-[120px]'
          )}
        />
        <div
          className={cn(
            'absolute right-[-10%] bottom-[-10%] rounded-full',
            isLight
              ? 'bg-brand/20 h-[45%] w-[45%] blur-[140px]'
              : 'bg-brand/10 h-[40%] w-[40%] blur-[120px]'
          )}
        />
        {isLight && (
          <div className="bg-brand/[0.08] absolute top-1/2 left-1/2 h-[50%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[160px]" />
        )}
      </div>

      <DynamicIslandNav />

      <main className="relative">{children}</main>

      <LandingFooter />
    </div>
  );
}
