import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { ScrollReveal } from './ScrollReveal';
import { LANDING_EYEBROW, LANDING_LEAD, LANDING_TITLE } from './landingStyles';

interface LandingSectionHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
  className?: string;
  children?: ReactNode;
}

export function LandingSectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className,
  children,
}: LandingSectionHeaderProps) {
  return (
    <ScrollReveal className={cn(align === 'center' ? 'text-center' : 'text-left', className)}>
      <p className={LANDING_EYEBROW}>{eyebrow}</p>
      <h2 className={LANDING_TITLE}>{title}</h2>
      {subtitle && (
        <p className={cn(LANDING_LEAD, align === 'left' && 'mx-0 max-w-xl')}>{subtitle}</p>
      )}
      {children}
    </ScrollReveal>
  );
}
