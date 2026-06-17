import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RevenueChartProps {
  data: { month: string; income: string | number }[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-zinc-100 dark:text-zinc-800"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            stroke="currentColor"
            className="text-zinc-400"
            fontSize={10}
            fontWeight="600"
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `Mes ${val}`}
          />
          <YAxis
            stroke="currentColor"
            className="text-zinc-400"
            fontSize={10}
            fontWeight="600"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            cursor={{ fill: 'currentColor', opacity: 0.05 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const point = payload[0].payload as { month: string; income: string | number };
                return (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-xl">
                    <p className="text-zinc-500 text-xs mb-1">Mes {point.month}</p>
                    <p className="text-lg font-black text-orange-500">${payload[0].value}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="income" fill="#f97316" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
