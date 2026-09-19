import { useMemo, useState } from 'react';
import { CalendarClock, TrendingUp, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from '../ui';
import { hapticLight } from '../../lib/haptics';

interface ExpiryItem {
  user_id: number;
  full_name: string;
  membership_name: string;
  days_remaining: number;
  end_date: string;
}

interface Bucket {
  label: string;
  shortLabel: string;
  count: number;
  items: ExpiryItem[];
  color: string;
  bgColor: string;
}

function AnimatedBar({ percent, color, delay }: { percent: number; color: string; delay: number }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-t-md">
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-md transition-[height] duration-700"
        style={{
          height: `${percent}%`,
          background: `linear-gradient(to top, ${color}, ${color}cc)`,
          transitionTimingFunction: 'var(--ease-spring)',
          transitionDelay: `${delay}ms`,
        }}
      />
      {/* Specular top-edge highlight */}
      <div
        className="absolute inset-x-0 rounded-t-md transition-[bottom,opacity] duration-700"
        style={{
          bottom: `${percent}%`,
          height: '1px',
          background: `linear-gradient(90deg, transparent 10%, ${color}40 50%, transparent 90%)`,
          opacity: percent > 5 ? 1 : 0,
          transitionTimingFunction: 'var(--ease-spring)',
          transitionDelay: `${delay}ms`,
        }}
      />
    </div>
  );
}

export function ExpiryForecastChart({ expiringList }: { expiringList: ExpiryItem[] }) {
  const [hoveredBucket, setHoveredBucket] = useState<number | null>(null);

  const buckets: Bucket[] = useMemo(() => {
    const b7: ExpiryItem[] = [];
    const b15: ExpiryItem[] = [];
    const b30: ExpiryItem[] = [];

    for (const item of expiringList) {
      if (item.days_remaining <= 7) b7.push(item);
      else if (item.days_remaining <= 15) b15.push(item);
      else if (item.days_remaining <= 30) b30.push(item);
    }

    return [
      {
        label: 'Próximos 7 días',
        shortLabel: '7d',
        count: b7.length,
        items: b7,
        color: '#ef4444',
        bgColor: 'bg-red-500/10',
      },
      {
        label: '8 – 15 días',
        shortLabel: '15d',
        count: b15.length,
        items: b15,
        color: '#f59e0b',
        bgColor: 'bg-amber-500/10',
      },
      {
        label: '16 – 30 días',
        shortLabel: '30d',
        count: b30.length,
        items: b30,
        color: '#22c55e',
        bgColor: 'bg-emerald-500/10',
      },
    ];
  }, [expiringList]);

  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const totalExpiring = buckets.reduce((sum, b) => sum + b.count, 0);

  if (totalExpiring === 0) return null;

  return (
    <Card padding="sm" rounded="xl">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="text-brand h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="text-text text-sm font-semibold">Proyección de renovaciones</h3>
          <p className="text-text-muted text-small">
            {totalExpiring} membresía{totalExpiring !== 1 ? 's' : ''} por renovar en 30 días
          </p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-3 sm:gap-4" style={{ height: '7rem' }}>
        {buckets.map((bucket, i) => {
          const percent = (bucket.count / maxCount) * 100;
          const isHovered = hoveredBucket === i;
          return (
            <button
              key={bucket.shortLabel}
              type="button"
              className={cn(
                'group relative flex flex-1 flex-col items-center gap-1',
                'h-full cursor-pointer transition-transform duration-200',
                isHovered && 'scale-[1.02]'
              )}
              onPointerEnter={() => {
                hapticLight();
                setHoveredBucket(i);
              }}
              onPointerLeave={() => setHoveredBucket(null)}
              aria-label={`${bucket.label}: ${bucket.count} membresías`}
            >
              {/* Count label above bar */}
              <span
                className={cn(
                  'text-text text-xs font-bold tabular-nums transition-opacity duration-200',
                  bucket.count === 0 && 'text-text-muted opacity-50'
                )}
              >
                {bucket.count}
              </span>
              {/* The bar itself */}
              <div className="relative w-full flex-1">
                <AnimatedBar percent={percent} color={bucket.color} delay={i * 80} />
              </div>
              {/* Label */}
              <span className="text-text-muted text-small mt-1 font-semibold">
                {bucket.shortLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Detail row on hover */}
      {hoveredBucket !== null && buckets[hoveredBucket].count > 0 && (
        <div
          className={cn(
            'mt-3 rounded-lg border px-3 py-2',
            'border-border/60 bg-surface-raised',
            'animate-pop-in'
          )}
        >
          <p className="text-text text-xs font-semibold">
            <CalendarClock className="mr-1 inline-block h-3 w-3 align-[-2px]" />
            {buckets[hoveredBucket].label}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {buckets[hoveredBucket].items.slice(0, 6).map((item) => (
              <span
                key={item.user_id}
                className="border-border/60 bg-surface text-text-secondary inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs"
              >
                <Users className="h-2.5 w-2.5 shrink-0 opacity-50" />
                <span className="max-w-[8rem] truncate">{item.full_name}</span>
              </span>
            ))}
            {buckets[hoveredBucket].items.length > 6 && (
              <span className="text-text-muted self-center text-xs font-medium">
                +{buckets[hoveredBucket].items.length - 6} más
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
