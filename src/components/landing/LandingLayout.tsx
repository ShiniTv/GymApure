import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { DynamicIslandNav } from './DynamicIslandNav';
import { LandingBackground } from './LandingBackground';
import { LandingStickyCta } from './LandingStickyCta';
import { useLandingDarkDefault } from './useLandingDarkDefault';
import { useLandingMeta } from './useLandingMeta';
import { LandingFooter } from './sections/LandingFooter';
import { getDemoRequestPath } from '../../config/landingContact';

interface LandingLayoutProps {
  children: ReactNode;
}

export function LandingLayout({ children }: LandingLayoutProps) {
  useLandingDarkDefault();
  useLandingMeta();

  const location = useLocation();
  const isDemoFormPage = location.pathname === getDemoRequestPath();

  return (
    <div
      className={cn(
        'relative min-h-dvh overflow-x-hidden bg-zinc-50 text-zinc-900 transition-colors duration-300',
        'dark:bg-zinc-950 dark:text-white'
      )}
    >
      <LandingBackground />

      <DynamicIslandNav />

      <main className={cn('relative', isDemoFormPage ? 'pb-8 md:pb-10' : 'pb-24 md:pb-0')}>
        {children}
      </main>

      <LandingFooter />

      {!isDemoFormPage && <LandingStickyCta />}
    </div>
  );
}
