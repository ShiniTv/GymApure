import { type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ScrollRevealMotion } from '../animations';
import { cn } from '../../lib/utils';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  variant?: 'slide' | 'scale';
}

export function ScrollReveal({ children, className, variant = 'slide' }: ScrollRevealProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <ScrollRevealMotion className={className} variant={variant}>
      {children}
    </ScrollRevealMotion>
  );
}
