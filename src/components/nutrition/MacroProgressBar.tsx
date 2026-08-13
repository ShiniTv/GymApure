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
      <div className="text-small flex items-center justify-between gap-2">
        <span className="text-text-secondary font-semibold">{label}</span>
        <span className="text-text-muted tabular-nums">
          {Math.round(consumed)}
          {unit ? ` ${unit}` : ''} / {target}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
      <div className="bg-surface-raised relative h-2 overflow-hidden rounded-full">
        <div
          className="bg-success/15 absolute inset-y-0"
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
      <p className="text-small text-text-muted">{macroStatusLabel(status)}</p>
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
  const color = percent >= 75 ? 'bg-success' : percent >= 50 ? 'bg-warning' : 'bg-danger';
  return (
    <div className="space-y-1">
      <div className="text-small text-text-muted flex justify-between">
        <span>{label}</span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <div className="bg-surface-raised h-1.5 overflow-hidden rounded-full">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${percent}%` }} />
      </div>
      {status && status !== 'on_track' && (
        <p className="text-small text-text-muted">{macroStatusLabel(status)}</p>
      )}
    </div>
  );
}
