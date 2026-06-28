import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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
    <div className={className ?? 'h-72'}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={numericData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-zinc-100 dark:text-zinc-800"
            vertical={false}
          />
          <XAxis
            dataKey="period"
            stroke="currentColor"
            className="text-zinc-400"
            fontSize={10}
            fontWeight="600"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            tickFormatter={(val) => formatPeriodLabel(String(val), mode)}
          />
          <YAxis
            stroke="currentColor"
            className="text-zinc-400"
            fontSize={10}
            fontWeight="600"
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
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl shadow-xl">
                    <p className="text-zinc-500 text-[10px] mb-0.5">{formatPeriodTitle(point.period, mode)}</p>
                    <p className="text-base font-semibold text-brand tabular-nums">${point.income}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="income" fill="var(--chart-accent)" radius={[4, 4, 0, 0]} maxBarSize={mode === 'day' ? 18 : 32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
