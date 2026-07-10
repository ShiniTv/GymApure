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
        'overflow-hidden rounded-2xl border transition-colors duration-200',
        open
          ? 'border-brand/30 border-l-brand/50 dark:border-brand/25 border-l-2'
          : 'border-zinc-200 dark:border-zinc-800',
        className
      )}
    >
      <button
        id={buttonId}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="focus-visible:ring-brand/50 flex w-full items-center justify-between gap-3 bg-zinc-50/80 px-5 py-4 text-left transition-colors hover:bg-zinc-100/80 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset dark:bg-zinc-900/40 dark:hover:bg-zinc-900/60"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          {icon}
          {title}
        </span>
        <ChevronDown
          className={cn(
            'h-5 w-5 text-zinc-400 transition-transform dark:text-zinc-300',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <div id={panelId} role="region" aria-labelledby={buttonId} className="p-5 pt-2">
          {children}
        </div>
      )}
    </div>
  );
}

export function Accordion({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('space-y-3', className)}>{children}</div>;
}
