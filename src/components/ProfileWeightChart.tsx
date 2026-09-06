import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { chartAxisTick, chartHeights } from '../lib/chartTheme';

interface WeightPoint {
  date: string;
  weight: number;
}

interface ProfileWeightChartProps {
  data: WeightPoint[];
}

export default function ProfileWeightChart({ data }: ProfileWeightChartProps) {
  return (
    <div className={chartHeights.dashboard}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-border"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="currentColor"
            className="text-text-muted"
            {...chartAxisTick}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="currentColor"
            className="text-text-muted"
            {...chartAxisTick}
            tickLine={false}
            axisLine={false}
            domain={['dataMin - 2', 'dataMax + 2']}
            tickFormatter={(v) => `${v} kg`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              fontWeight: 500,
              fontSize: '12px',
            }}
            formatter={(value) => [`${value ?? 0} kg`, 'Peso']}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="var(--chart-accent)"
            strokeWidth={2}
            dot={{ fill: 'var(--chart-accent)', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
