import { Button, SegmentedControl } from '../../components/ui';
import { COUNTER_PRIMARY_TABS, COUNTER_SECONDARY_TABS } from './counterConstants';
import type { ReceptionTab } from './types';

export function CounterTabNav({
  tab,
  insideCount,
  onChange,
  renewLabel = 'Renovar',
}: {
  tab: ReceptionTab;
  insideCount: number;
  onChange: (next: ReceptionTab) => void;
  renewLabel?: string;
}) {
  const isSecondary = COUNTER_SECONDARY_TABS.some((t) => t.value === tab);

  return (
    <div className="space-y-2">
      <SegmentedControl
        variant="compact"
        fullWidth
        className="w-full"
        value={isSecondary ? 'access' : tab}
        onChange={(next) => {
          if (next === 'access' || next === 'inside') onChange(next);
        }}
        ariaLabel="Acceso del mostrador"
        options={COUNTER_PRIMARY_TABS.map((opt) => ({
          value: opt.value,
          label: opt.label,
          icon: opt.icon,
          count: opt.value === 'inside' ? insideCount : undefined,
        }))}
      />
      <div className="flex flex-wrap gap-1.5">
        {COUNTER_SECONDARY_TABS.map((opt) => {
          const label = opt.value === 'renew' ? renewLabel : opt.label;
          const active = tab === opt.value;
          const Icon = opt.icon;
          return (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={active ? 'secondary' : 'ghost'}
              className="h-9 gap-1.5 px-2.5 text-xs"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
