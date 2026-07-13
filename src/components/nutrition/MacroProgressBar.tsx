import { cn } from '../../lib/utils';
import {
  getMacroStatus,
  macroStatusColorClass,
  macroStatusLabel,
  type MacroStatus,
} from '../../lib/nutrition';

interface MacroProgressBarProps {
  label: string;
  consumed: number;
  target: number;
  margin: number;
  unit?: string;
  className?: string;
}

export function MacroProgressBar({
  label,
  consumed,
  target,
  margin,
  unit = '',
  className,
}: MacroProgressBarProps) {
  const status = getMacroStatus(consumed, target, margin);
  const low = Math.max(0, target - margin);
  const high = target + margin;
  const max = high * 1.15 || 1;
  const fillPct = Math.min(100, (consumed / max) * 100);
  const bandStart = (low / max) * 100;
  const bandWidth = ((high - low) / max) * 100;

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">{label}</span>
        <span className="text-zinc-500 tabular-nums dark:text-zinc-400">
          {Math.round(consumed)}
          {unit ? ` ${unit}` : ''} / {target}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="absolute inset-y-0 bg-emerald-500/15 dark:bg-emerald-500/20"
          style={{ left: `${bandStart}%`, width: `${bandWidth}%` }}
          aria-hidden
        />
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-all',
            macroStatusColorClass(status)
          )}
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{macroStatusLabel(status)}</p>
    </div>
  );
}

export function AdherenceBar({
  percent,
  status,
  label,
}: {
  percent: number;
  status?: MacroStatus;
  label: string;
}) {
  const color = percent >= 75 ? 'bg-emerald-500' : percent >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
        <span>{label}</span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${percent}%` }} />
      </div>
      {status && status !== 'on_track' && (
        <p className="text-[9px] text-zinc-400 dark:text-zinc-300">{macroStatusLabel(status)}</p>
      )}
    </div>
  );
}
