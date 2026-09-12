import React from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { chartAxisTick, chartHeights } from '../lib/chartTheme';

export interface WeightChartPoint {
  date: string;
  weight: number;
  bodyFat?: number | null;
}

interface ProfileWeightChartProps {
  data: WeightChartPoint[];
}

export default function ProfileWeightChart({ data }: ProfileWeightChartProps) {
  if (data.length === 0) {
    return (
      <div className="border-border/70 text-text-muted flex h-48 w-full items-center justify-center rounded-xl border border-dashed text-xs">
        Sin datos suficientes para graficar
      </div>
    );
  }

  const hasFat = data.some((d) => d.bodyFat != null);

  return (
    <div className={chartHeights.dashboard}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.28} />
              <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-border/40"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            stroke="currentColor"
            className="text-text-muted text-[11px]"
            {...chartAxisTick}
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            yAxisId="weight"
            stroke="currentColor"
            className="text-text-muted text-[11px]"
            {...chartAxisTick}
            tickLine={false}
            axisLine={false}
            domain={['dataMin - 1.5', 'dataMax + 1.5']}
            tickFormatter={(v) => `${v}k`}
          />

          {hasFat && (
            <YAxis
              yAxisId="fat"
              orientation="right"
              stroke="currentColor"
              className="text-text-muted text-[11px]"
              {...chartAxisTick}
              tickLine={false}
              axisLine={false}
              domain={['dataMin - 2', 'dataMax + 2']}
              tickFormatter={(v) => `${v}%`}
            />
          )}

          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              boxShadow: '0 8px 24px -6px rgba(0,0,0,0.3)',
              fontWeight: 500,
              fontSize: '12px',
              padding: '8px 12px',
            }}
            formatter={(value: unknown, name: unknown) => {
              if (name === 'weight') return [`${typeof value === 'number' ? value : 0} kg`, 'Peso'];
              if (name === 'bodyFat')
                return [`${typeof value === 'number' ? value : 0}%`, 'Grasa corporal'];
              return [String(value), String(name)];
            }}
            labelStyle={{ color: 'var(--color-text)', fontWeight: 600, marginBottom: '4px' }}
          />

          <Area
            yAxisId="weight"
            type="monotone"
            dataKey="weight"
            stroke="var(--color-brand)"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#weightGradient)"
            activeDot={{ r: 5, fill: 'var(--color-brand)', strokeWidth: 2, stroke: '#fff' }}
          />

          {hasFat && (
            <Line
              yAxisId="fat"
              type="monotone"
              dataKey="bodyFat"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ fill: '#10b981', r: 2.5 }}
              activeDot={{ r: 4, fill: '#10b981' }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
