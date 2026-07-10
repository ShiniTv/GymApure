import { DollarSign, Fingerprint, Users, Download, FileSpreadsheet } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatShowcaseDate, type LandingShowcaseData } from '../../../config/landingShowcase';

interface ReportsPanelMockupProps {
  data: LandingShowcaseData['reports'];
}

const REPORT_META = [
  {
    key: 'payments' as const,
    title: 'Pagos',
    description: 'Montos, método y estado',
    icon: DollarSign,
  },
  {
    key: 'attendance' as const,
    title: 'Asistencias',
    description: 'Entradas, salidas y duración',
    icon: Fingerprint,
  },
  { key: 'members' as const, title: 'Miembros', description: 'Altas, bajas y estado', icon: Users },
];

export function ReportsPanelMockup({ data }: ReportsPanelMockupProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold tracking-wide text-zinc-500 uppercase sm:text-xs dark:text-zinc-400">
            Supervisión
          </p>
          <h3 className="text-sm font-bold text-zinc-900 sm:text-base dark:text-white">Reportes</h3>
        </div>
        <div className="bg-brand/10 text-brand inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold">
          <FileSpreadsheet className="h-3 w-3" aria-hidden />
          Exportar
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[10px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          {formatShowcaseDate(data.dateFrom)}
        </div>
        <div className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[10px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          {formatShowcaseDate(data.dateTo)}
        </div>
      </div>

      <div className="space-y-2">
        {REPORT_META.map((report, index) => (
          <div
            key={report.key}
            className={cn(
              'flex items-center gap-3 rounded-xl border p-2.5 transition-colors',
              index === 0
                ? 'border-brand/30 bg-brand/5 dark:border-brand/25'
                : 'border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900'
            )}
          >
            <div
              className={cn(
                'rounded-lg p-2',
                index === 0
                  ? 'bg-brand/15 text-brand'
                  : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
              )}
            >
              <report.icon className="h-3.5 w-3.5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-900 dark:text-white">{report.title}</p>
              <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                {report.description}
              </p>
            </div>
            <p className="text-sm font-bold text-zinc-900 tabular-nums dark:text-white">
              {data[report.key]}
            </p>
          </div>
        ))}
      </div>

      <div className="brand-solid flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-white">
        <Download className="h-3.5 w-3.5" aria-hidden />
        Descargar reporte
      </div>
    </div>
  );
}
