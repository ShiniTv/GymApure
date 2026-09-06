import { useState, useId, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AccordionItemProps {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export function AccordionItem({
  title,
  icon,
  defaultOpen = false,
  children,
  className,
}: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const buttonId = useId();

  return (
    <div
      className={cn(
        'bg-surface overflow-hidden rounded-[var(--radius-card)] border transition-colors duration-200',
        open
          ? 'border-brand/30 border-l-brand/50 dark:border-brand/25 border-l-2'
          : 'border-border/80 dark:border-border/80',
        className
      )}
    >
      <button
        id={buttonId}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="focus-visible:ring-brand/50 bg-surface-raised/60 hover:bg-surface-overlay/70 flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="text-text flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </span>
        <ChevronDown
          className={cn('text-text-muted h-5 w-5 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div id={panelId} role="region" aria-labelledby={buttonId} className="p-4 pt-2">
          {children}
        </div>
      )}
    </div>
  );
}

export function Accordion({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('space-y-3', className)}>{children}</div>;
}
