import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { chartAxisTick, chartHeights, chartTooltipClass } from '../lib/chartTheme';
import { typography } from '../lib/typography';
import { cn } from '../lib/utils';

export type RevenueChartMode = 'day' | 'month';

export interface RevenueChartPoint {
  period: string;
  income: string | number;
}

interface RevenueChartProps {
  data: RevenueChartPoint[];
  mode?: RevenueChartMode;
  className?: string;
}

function formatPeriodLabel(period: string, mode: RevenueChartMode): string {
  if (mode === 'month') {
    const [, month] = period.split('-');
    return month ? `M${month}` : period;
  }
  const [, month, day] = period.split('-');
  return month && day ? `${day}/${month}` : period;
}

function formatPeriodTitle(period: string, mode: RevenueChartMode): string {
  if (mode === 'month') return `Mes ${period}`;
  const [year, month, day] = period.split('-');
  return year && month && day ? `${day}/${month}/${year}` : period;
}

export default function RevenueChart({ data, mode = 'month', className }: RevenueChartProps) {
  const numericData = data.map((row) => ({
    ...row,
    income: parseFloat(String(row.income)) || 0,
  }));

  return (
    <div className={className ?? chartHeights.dashboard}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={numericData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-border"
            vertical={false}
          />
          <XAxis
            dataKey="period"
            stroke="currentColor"
            className="text-text-muted"
            {...chartAxisTick}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            tickFormatter={(val) => formatPeriodLabel(String(val), mode)}
          />
          <YAxis
            stroke="currentColor"
            className="text-text-muted"
            {...chartAxisTick}
            tickLine={false}
            axisLine={false}
            width={42}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            cursor={{ fill: 'currentColor', opacity: 0.05 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const point = payload[0].payload as RevenueChartPoint & { income: number };
                return (
                  <div className={chartTooltipClass}>
                    <p className={cn(typography.small, 'text-text-muted mb-0.5')}>
                      {formatPeriodTitle(point.period, mode)}
                    </p>
                    <p className="text-brand text-base font-semibold tabular-nums">
                      ${point.income}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="income"
            fill="var(--chart-accent)"
            radius={[4, 4, 0, 0]}
            maxBarSize={mode === 'day' ? 18 : 32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
