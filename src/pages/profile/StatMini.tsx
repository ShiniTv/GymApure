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
    <Card padding="sm" rounded="xl">
      <p className={typography.statLabel + ' mb-0.5 text-[10px]'}>{label}</p>
      <p className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white tracking-tight leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{sub}</p>}
    </Card>
  );
}
