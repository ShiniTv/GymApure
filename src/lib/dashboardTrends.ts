import { format, subDays } from 'date-fns';

export type TrendTone = 'up' | 'down' | 'neutral';

export function checkInsTrend(
  today: number,
  yesterday: number
): { label: string; tone: TrendTone } {
  const diff = today - yesterday;
  if (diff > 0) return { label: `+${diff} vs ayer`, tone: 'up' };
  if (diff < 0) return { label: `${diff} vs ayer`, tone: 'down' };
  return { label: 'Igual que ayer', tone: 'neutral' };
}

export function revenueMonthTrend(
  thisMonth: number,
  lastMonth: number
): { label: string; tone: TrendTone } {
  if (lastMonth === 0) {
    if (thisMonth > 0) return { label: 'Arranque del mes', tone: 'up' };
    return { label: 'Sin ingresos aún', tone: 'neutral' };
  }
  const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  if (pct > 0) return { label: `+${pct}% vs mes ant.`, tone: 'up' };
  if (pct < 0) return { label: `${pct}% vs mes ant.`, tone: 'down' };
  return { label: 'Igual al mes ant.', tone: 'neutral' };
}

export function fillDailyRevenueSeries(
  daily: { date: string; income: string | number }[],
  days: number
): { period: string; income: number }[] {
  const map = new Map(
    daily.map((row) => [row.date, parseFloat(String(row.income)) || 0])
  );
  const result: { period: string; income: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const key = format(subDays(new Date(), i), 'yyyy-MM-dd');
    result.push({ period: key, income: map.get(key) ?? 0 });
  }

  return result;
}
