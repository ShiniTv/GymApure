import { Link } from 'react-router-dom';
import { type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface QuickActionProps {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  count?: number;
  tone?: 'orange' | 'red' | 'blue' | 'emerald';
}

const toneMap = {
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-500 group-hover:bg-orange-500/20',
  red: 'bg-red-500/10 text-red-600 dark:text-red-500 group-hover:bg-red-500/20',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-500 group-hover:bg-blue-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 group-hover:bg-emerald-500/20',
};

const toneBadgeMap = {
  orange: 'bg-orange-500 text-white',
  red: 'bg-red-500 text-white',
  blue: 'bg-blue-500 text-white',
  emerald: 'bg-emerald-500 text-white',
};

export function QuickAction({ to, icon: Icon, title, description, count, tone = 'orange' }: QuickActionProps) {
  return (
    <Link
      to={to}
      aria-label={`${title}: ${description}`}
      className="group flex items-start gap-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-orange-500/40 transition-all active:scale-[0.98]"
    >
      <div className={cn('p-3 rounded-xl transition-colors shrink-0', toneMap[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">{title}</p>
          {count != null && count > 0 && (
            <span className={cn('min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-black', toneBadgeMap[tone])}>
              {count > 99 ? '99+' : count}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{description}</p>
      </div>
    </Link>
  );
}
