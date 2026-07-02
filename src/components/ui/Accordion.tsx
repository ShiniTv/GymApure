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
    <div className={cn('border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden', className)}>
      <button
        id={buttonId}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-inset"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          {icon}
          {title}
        </span>
        <ChevronDown
          className={cn('h-5 w-5 text-zinc-400 dark:text-zinc-300 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && <div id={panelId} role="region" aria-labelledby={buttonId} className="p-5 pt-2">{children}</div>}
    </div>
  );
}

export function Accordion({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('space-y-3', className)}>{children}</div>;
}
