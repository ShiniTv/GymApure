import { Activity, DollarSign, Fingerprint, AlertTriangle } from 'lucide-react';
import { cn, formatMoney } from '../../../lib/utils';
import type { LandingShowcaseData } from '../../../config/landingShowcase';

interface AdminPanelMockupProps {
  data: LandingShowcaseData['admin'];
}

const toneMap = {
  brand: 'text-brand bg-brand/10',
  blue: 'text-blue-600 bg-blue-500/10 dark:text-blue-400',
  emerald: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400',
  red: 'text-red-600 bg-red-500/10 dark:text-red-400',
};

export function AdminPanelMockup({ data }: AdminPanelMockupProps) {
  const stats = [
    {
      label: 'Ingresos del mes',
      value: formatMoney(data.revenueThisMonth),
      icon: DollarSign,
      tone: 'brand' as const,
    },
    {
      label: 'Check-ins hoy',
      value: String(data.todayCheckIns),
      icon: Fingerprint,
      tone: 'blue' as const,
    },
    {
      label: 'Miembros activos',
      value: String(data.activeMembers),
      icon: Activity,
      tone: 'emerald' as const,
    },
    {
      label: 'Pagos pendientes',
      value: String(data.pendingPayments),
      icon: AlertTriangle,
      tone: 'red' as const,
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold tracking-wide text-zinc-500 uppercase sm:text-xs dark:text-zinc-400">
          Panel administrativo
        </p>
        <h3 className="text-sm font-bold text-zinc-900 sm:text-base dark:text-white">
          Administración <span className="text-brand">general</span>
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-zinc-200/80 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="truncate text-[9px] font-medium tracking-wide text-zinc-500 uppercase sm:text-[10px] dark:text-zinc-400">
                  {stat.label}
                </p>
                <p className="mt-0.5 text-base font-bold text-zinc-900 tabular-nums sm:text-lg dark:text-white">
                  {stat.value}
                </p>
              </div>
              <div className={cn('rounded-lg p-1.5', toneMap[stat.tone])}>
                <stat.icon className="h-3.5 w-3.5" aria-hidden />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200/80 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold text-zinc-700 sm:text-xs dark:text-zinc-300">
            Ingresos — últimos 7 días
          </p>
          <span className="text-brand text-[10px] font-bold">+{data.revenueTrendPercent}%</span>
        </div>
        <div className="flex h-16 items-end gap-1.5 sm:h-20">
          {data.chartBars.map((height, i) => (
            <div
              key={i}
              className="bg-brand/80 flex-1 rounded-t-sm"
              style={{ height: `${height}%` }}
              aria-hidden
            />
          ))}
        </div>
      </div>
    </div>
  );
}
