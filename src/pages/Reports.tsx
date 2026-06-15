import { useState } from 'react';
import { downloadReport } from '../lib/api';
import { FileSpreadsheet, Download, Calendar, DollarSign, Users, Fingerprint } from 'lucide-react';
import { format, subDays } from 'date-fns';

type ReportType = 'payments' | 'attendance' | 'members';

const REPORTS: {
  type: ReportType;
  title: string;
  description: string;
  icon: typeof DollarSign;
  hasDateRange: boolean;
}[] = [
  {
    type: 'payments',
    title: 'Pagos',
    description: 'Ingresos reportados y aprobados con montos, método y estado.',
    icon: DollarSign,
    hasDateRange: true,
  },
  {
    type: 'attendance',
    title: 'Asistencias',
    description: 'Entradas, salidas y duración de cada visita al gym.',
    icon: Fingerprint,
    hasDateRange: true,
  },
  {
    type: 'members',
    title: 'Miembros',
    description: 'Listado de miembros con membresía activa y días restantes.',
    icon: Users,
    hasDateRange: false,
  },
];

export default function Reports() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [downloading, setDownloading] = useState<ReportType | null>(null);
  const [error, setError] = useState('');

  const handleDownload = async (type: ReportType, hasDateRange: boolean) => {
    setDownloading(type);
    setError('');
    try {
      await downloadReport(type, hasDateRange ? { from, to } : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase">
          Reportes <span className="text-orange-500">exportables</span>
        </h1>
        <p className="text-zinc-500 font-medium mt-1">
          Descarga archivos CSV para contabilidad, cierre mensual y análisis operativo.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-4">
          <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Rango de fechas (pagos y asistencias)
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">
              Desde
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          const isLoading = downloading === report.type;
          return (
            <div
              key={report.type}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-orange-500/10 rounded-xl">
                  <Icon className="h-6 w-6 text-orange-600 dark:text-orange-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">
                    {report.title}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{report.description}</p>
                </div>
              </div>

              <div className="mt-auto pt-4">
                {report.hasDateRange && (
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                    {from} → {to}
                  </p>
                )}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleDownload(report.type, report.hasDateRange)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <FileSpreadsheet className="h-4 w-4 animate-pulse" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Descargar CSV
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
