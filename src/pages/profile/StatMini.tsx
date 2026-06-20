import { Card } from '../../components/ui';
import { typography } from '../../lib/typography';

export function StatMini({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card padding="sm">
      <p className={typography.statLabel + ' mb-1'}>{label}</p>
      <p className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </Card>
  );
}
