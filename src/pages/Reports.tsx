import { useState, useEffect } from 'react';

import { downloadReport, apiFetch, parseJsonResponse } from '../lib/api';
import { useDebouncedValue } from '../lib/useDebouncedValue';

import { FileSpreadsheet, Download, Calendar, DollarSign, Users, Fingerprint } from 'lucide-react';

import { format, subDays, startOfMonth } from 'date-fns';

import { Button, Card, Input, Label, PageHeader, Spinner, Skeleton } from '../components/ui';



type ReportType = 'payments' | 'attendance' | 'members';



interface ReportPreview {

  payments: number;

  attendance: number;

  members: number;

}



const REPORTS: {

  type: ReportType;

  title: string;

  description: string;

  icon: typeof DollarSign;

  hasDateRange: boolean;

  previewKey: keyof ReportPreview;

}[] = [

  {

    type: 'payments',

    title: 'Pagos',

    description: 'Montos, método y estado aprobado.',

    icon: DollarSign,

    hasDateRange: true,

    previewKey: 'payments',

  },

  {

    type: 'attendance',

    title: 'Asistencias',

    description: 'Entradas, salidas y duración.',

    icon: Fingerprint,

    hasDateRange: true,

    previewKey: 'attendance',

  },

  {

    type: 'members',

    title: 'Miembros',

    description: 'Activos con días restantes.',

    icon: Users,

    hasDateRange: false,

    previewKey: 'members',

  },

];



export default function Reports() {

  const today = format(new Date(), 'yyyy-MM-dd');

  const monthAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');



  const [from, setFrom] = useState(monthAgo);

  const [to, setTo] = useState(today);

  const debouncedFrom = useDebouncedValue(from, 400);
  const debouncedTo = useDebouncedValue(to, 400);

  const [downloading, setDownloading] = useState<ReportType | null>(null);

  const [error, setError] = useState('');

  const [preview, setPreview] = useState<ReportPreview | null>(null);

  const [previewLoading, setPreviewLoading] = useState(true);



  useEffect(() => {

    let cancelled = false;

    setPreviewLoading(true);

    const params = new URLSearchParams({ from: debouncedFrom, to: debouncedTo });

    apiFetch(`/api/reports/preview?${params}`)

      .then((res) => parseJsonResponse<ReportPreview>(res))

      .then((data) => {

        if (!cancelled) setPreview(data);

      })

      .catch(() => {

        if (!cancelled) setPreview(null);

      })

      .finally(() => {

        if (!cancelled) setPreviewLoading(false);

      });

    return () => {

      cancelled = true;

    };

  }, [debouncedFrom, debouncedTo]);



  const setLastDays = (days: number) => {
    setFrom(format(subDays(new Date(), days), 'yyyy-MM-dd'));
    setTo(today);
  };

  const setCurrentMonth = () => {
    setFrom(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    setTo(today);
  };

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
    <div className="page-stack-tight">
      <PageHeader
        compact
        title={<>Reportes <span className="text-brand">exportables</span></>}
        subtitle="CSV para contabilidad, cierre mensual y análisis."
      />

      {error && (
        <Card padding="sm" className="border-red-500/30 bg-red-500/10">
          <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
        </Card>
      )}

      <Card padding="sm" rounded="xl">
        <div className="flex items-center gap-2 mb-2.5">
          <Calendar className="h-4 w-4 text-brand shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
              Rango de fechas
            </h2>
            <p className="text-[10px] text-zinc-500 leading-tight">Pagos y asistencias</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0">
            <Label className="text-[11px]">Desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="min-w-0">
            <Label className="text-[11px]">Hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2.5 text-[11px]" onClick={() => setLastDays(7)}>
            7 días
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2.5 text-[11px]" onClick={() => setLastDays(30)}>
            30 días
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2.5 text-[11px]" onClick={setCurrentMonth}>
            Este mes
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          const isLoading = downloading === report.type;
          const count = preview?.[report.previewKey];

          return (
            <Card key={report.type} padding="sm" rounded="xl" className="flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex items-start gap-2 min-w-0">
                  <div className="p-1.5 bg-brand/10 rounded-lg shrink-0">
                    <Icon className="h-4 w-4 text-brand dark:text-brand" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-white leading-tight">
                      {report.title}
                    </h3>
                    <p className="hidden sm:block text-[11px] text-zinc-500 mt-0.5 leading-snug line-clamp-1">
                      {report.description}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right pl-1">
                  {previewLoading ? (
                    <Skeleton className="h-7 w-8 ml-auto" />
                  ) : (
                    <>
                      <p className="text-lg sm:text-xl font-bold text-brand tabular-nums leading-none">
                        {count ?? '—'}
                      </p>
                      <p className="text-[9px] uppercase tracking-wide text-zinc-400 mt-0.5">reg.</p>
                    </>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                className="mt-auto w-full h-10 sm:h-11"
                disabled={isLoading}
                aria-label={`Descargar CSV de ${report.title}`}
                onClick={() => handleDownload(report.type, report.hasDateRange)}
              >
                {isLoading ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    <span className="hidden sm:inline">Descargando…</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Descargar CSV</span>
                  </>
                )}
              </Button>
            </Card>
          );
        })}
      </div>

      <p className="flex items-start gap-2 text-[11px] sm:text-xs text-zinc-500 px-0.5">
        <FileSpreadsheet className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
        UTF-8 compatible con Excel. Se generan en el servidor al descargar.
      </p>
    </div>
  );
}

