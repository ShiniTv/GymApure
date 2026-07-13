import { type ReactNode } from 'react';
import { cn } from '../lib/utils';

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      {children}
    </div>
  );
}

export function FadeIn({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200',
        className
      )}
    >
      {children}
    </div>
  );
}

export function StaggerContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('stagger-fade-in', className)}>{children}</div>;
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function ScaleIn({ children }: { children: ReactNode }) {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200">
      {children}
    </div>
  );
}

export function ScrollRevealMotion({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  variant?: 'slide' | 'scale';
}) {
  return (
    <div
      className={cn(
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300',
        className
      )}
    >
      {children}
    </div>
  );
}

/** @deprecated CSS stagger — kept for API compatibility with framer-motion exports. */
export const scrollStaggerContainerVariants = {};
/** @deprecated CSS stagger — kept for API compatibility with framer-motion exports. */
export const scrollStaggerItemVariants = {};
