import { Fingerprint, Users, CreditCard, Search, CheckCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatCedulaDisplay, type LandingShowcaseData } from '../../../config/landingShowcase';

interface ReceptionPanelMockupProps {
  data: LandingShowcaseData['reception'];
}

const toneMap = {
  brand: 'text-brand',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  blue: 'text-blue-600 dark:text-blue-400',
};

export function ReceptionPanelMockup({ data }: ReceptionPanelMockupProps) {
  const kpis = [
    {
      label: 'Check-ins hoy',
      value: String(data.todayCheckIns),
      icon: Fingerprint,
      tone: 'brand' as const,
    },
    { label: 'Dentro ahora', value: String(data.insideNow), icon: Users, tone: 'emerald' as const },
    {
      label: 'Pagos pend.',
      value: String(data.pendingPayments),
      icon: CreditCard,
      tone: 'blue' as const,
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold tracking-wide text-zinc-500 uppercase sm:text-xs dark:text-zinc-400">
          Mostrador
        </p>
        <h3 className="text-sm font-bold text-zinc-900 sm:text-base dark:text-white">Recepción</h3>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-zinc-800">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="px-2 py-2.5 text-center">
              <div className="mb-1 flex items-center justify-center gap-1">
                <kpi.icon className={cn('h-3 w-3', toneMap[kpi.tone])} aria-hidden />
                <p className="truncate text-[8px] font-semibold tracking-wide text-zinc-500 uppercase sm:text-[9px] dark:text-zinc-400">
                  {kpi.label}
                </p>
              </div>
              <p className="text-lg font-bold text-zinc-900 tabular-nums dark:text-white">
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200/80 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-[10px] font-semibold text-zinc-700 sm:text-xs dark:text-zinc-300">
          Buscar por cédula
        </p>
        <div className="flex gap-2">
          <div className="flex min-h-9 flex-1 items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/50">
            {formatCedulaDisplay(data.memberCedula)}
          </div>
          <div className="bg-brand flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white">
            <Search className="h-4 w-4" aria-hidden />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
        <div className="flex items-start gap-2">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Acceso permitido
            </p>
            <p className="mt-0.5 text-[10px] text-emerald-600/90 sm:text-xs dark:text-emerald-400/90">
              {data.memberName} — {data.membershipName} · {data.daysRemaining} días restantes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
