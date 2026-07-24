import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CollapseProps {
  open: boolean;
  children: ReactNode;
  className?: string;
  /** Match CSS transition duration (ms) used for unmount after close */
  durationMs?: number;
}

/**
 * Smooth height expand/collapse via CSS grid rows (0fr ↔ 1fr).
 * Keeps children mounted through the exit animation, then unmounts.
 */
export function Collapse({ open, children, className, durationMs = 300 }: CollapseProps) {
  const [rendered, setRendered] = useState(open);
  const [expanded, setExpanded] = useState(open);

  useEffect(() => {
    if (open) {
      setRendered(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setExpanded(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setExpanded(false);
    const timer = window.setTimeout(() => setRendered(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [open, durationMs]);

  if (!rendered) return null;

  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows] ease-in-out',
        expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        className
      )}
      style={{ transitionDuration: `${durationMs}ms` }}
      aria-hidden={!expanded}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
