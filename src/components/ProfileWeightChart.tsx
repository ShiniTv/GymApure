import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface WeightPoint {
  date: string;
  weight: number;
}

interface ProfileWeightChartProps {
  data: WeightPoint[];
}

export default function ProfileWeightChart({ data }: ProfileWeightChartProps) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-zinc-100 dark:text-zinc-800"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="currentColor"
            className="text-zinc-400"
            fontSize={10}
            fontWeight="900"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="currentColor"
            className="text-zinc-400"
            fontSize={10}
            fontWeight="900"
            tickLine={false}
            axisLine={false}
            domain={['dataMin - 2', 'dataMax + 2']}
            tickFormatter={(v) => `${v} kg`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              fontWeight: '900',
              fontSize: '12px',
            }}
            formatter={(value) => [`${value ?? 0} kg`, 'Peso']}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="var(--chart-accent)"
            strokeWidth={3}
            dot={{ fill: 'var(--chart-accent)', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
