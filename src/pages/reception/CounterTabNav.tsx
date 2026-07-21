import { SegmentedControl } from '../../components/ui';
import { COUNTER_PRIMARY_TABS, COUNTER_SECONDARY_TABS } from './counterConstants';
import type { ReceptionTab } from './types';

const ALL_TABS = [...COUNTER_PRIMARY_TABS, ...COUNTER_SECONDARY_TABS];

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
  return (
    <SegmentedControl
      variant="compact"
      layout="wrap"
      className="w-full"
      value={tab}
      onChange={onChange}
      ariaLabel="Operaciones del mostrador"
      options={ALL_TABS.map((opt) => ({
        value: opt.value,
        label: opt.value === 'inside' ? 'Dentro' : opt.value === 'renew' ? renewLabel : opt.label,
        icon: opt.icon,
        count: opt.value === 'inside' ? insideCount : undefined,
      }))}
    />
  );
}
