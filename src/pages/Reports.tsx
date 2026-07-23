import { useState, useEffect } from 'react';

import { downloadReport, apiFetch, parseJsonResponse } from '../lib/api';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { cn, formatMoney } from '../lib/utils';

import {
  FileSpreadsheet,
  Download,
  Calendar,
  DollarSign,
  Users,
  Fingerprint,
  FileText,
} from 'lucide-react';

import { format, subDays, startOfMonth } from 'date-fns';

import {
  Button,
  Card,
  Input,
  Label,
  PageHeader,
  Skeleton,
  BackToDashboardLink,
  Badge,
  EmptyState,
} from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';

type ReportType = 'payments' | 'attendance' | 'members' | 'retention';
type ReportFormat = 'csv' | 'pdf';

interface ReportPreview {
  payments: number;
  attendance: number;
  members: number;
  retention?: number;
  paymentsTotalUsd?: number;
  paymentsApproved?: number;
  paymentsPending?: number;
  paymentsRejected?: number;
  samples?: {
    payments: {
      date: string;
      name: string;
      amountUsd: number;
      status: string;
      method: string;
    }[];
    attendance: {
      date: string;
      name: string;
      durationMinutes: number | null;
    }[];
    members: {
      name: string;
      membership: string | null;
      daysRemaining: number | null;
      status: string;
    }[];
  };
}

const REPORTS: {
  type: ReportType;
  title: string;
  description: string;
  icon: typeof DollarSign;
  hasDateRange: boolean;
  previewKey: keyof Pick<ReportPreview, 'payments' | 'attendance' | 'members' | 'retention'>;
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
  {
    type: 'retention',
    title: 'Retención',
    description: 'Renovaciones, vencidas, no-shows y asistencia.',
    icon: FileText,
    hasDateRange: true,
    previewKey: 'retention',
  },
];

function statusLabel(status: string): string {
  if (status === 'approved') return 'Aprobado';
  if (status === 'pending') return 'Pendiente';
  if (status === 'rejected') return 'Rechazado';
  if (status === 'active') return 'Activo';
  if (status === 'inactive') return 'Inactivo';
  return status;
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'default' {
  if (status === 'approved' || status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'rejected' || status === 'inactive') return 'danger';
  return 'default';
}

function formatSampleDate(value: string): string {
  try {
    return format(new Date(value), 'dd/MM/yyyy');
  } catch {
    return value;
  }
}

export default function Reports() {
  usePageTitle('Reportes');
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [selectedType, setSelectedType] = useState<ReportType>('payments');

  const debouncedFrom = useDebouncedValue(from, 400);
  const debouncedTo = useDebouncedValue(to, 400);

  const [downloading, setDownloading] = useState<{
    type: ReportType;
    format: ReportFormat;
  } | null>(null);

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

  const handleDownload = async (
    type: ReportType,
    hasDateRange: boolean,
    reportFormat: ReportFormat
  ) => {
    setDownloading({ type, format: reportFormat });
    setError('');

    try {
      await downloadReport(type, {
        ...(hasDateRange ? { from, to } : {}),
        format: reportFormat,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar');
    } finally {
      setDownloading(null);
    }
  };

  const selectedReport = REPORTS.find((r) => r.type === selectedType) ?? REPORTS[0];
  const selectedCount = preview?.[selectedReport.previewKey];

  return (
    <div className="page-stack-tight mx-auto w-full max-w-7xl">
      <PageHeader
        compact
        title={
          <>
            Reportes <span className="text-brand">exportables</span>
          </>
        }
        subtitle="Vista previa del rango + PDF/CSV para compartir o contabilidad."
        action={<BackToDashboardLink />}
      />

      {error && (
        <Card padding="sm" className="border-red-500/30 bg-red-500/10">
          <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
        </Card>
      )}

      <Card padding="sm" rounded="xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:mr-auto sm:mb-0.5">
            <Calendar className="text-brand h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm leading-tight font-bold text-zinc-900 dark:text-white">
                Rango de fechas
              </h2>
              <p className="text-[10px] leading-tight text-zinc-500 dark:text-zinc-400">
                Pagos, asistencias y retención
              </p>
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-end gap-2 sm:gap-3">
            <div className="w-[calc(50%-0.25rem)] min-w-0 sm:w-36">
              <Label className="text-[11px]">Desde</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="w-[calc(50%-0.25rem)] min-w-0 sm:w-36">
              <Label className="text-[11px]">Hasta</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-1.5 pb-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-[11px]"
                onClick={() => setLastDays(7)}
              >
                7 días
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-[11px]"
                onClick={() => setLastDays(30)}
              >
                30 días
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-[11px]"
                onClick={setCurrentMonth}
              >
                Este mes
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] lg:items-start">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {REPORTS.map((report) => {
            const Icon = report.icon;
            const count = preview?.[report.previewKey];
            const pdfLoading = downloading?.type === report.type && downloading.format === 'pdf';
            const csvLoading = downloading?.type === report.type && downloading.format === 'csv';
            const busy = downloading?.type === report.type;
            const selected = selectedType === report.type;

            return (
              <Card
                key={report.type}
                padding="sm"
                rounded="xl"
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`Vista previa de ${report.title}`}
                className={cn(
                  'flex cursor-pointer flex-col transition-colors',
                  selected
                    ? 'border-brand/40 bg-brand/[0.04] ring-brand/30 ring-1'
                    : 'hover:border-zinc-300 dark:hover:border-zinc-700'
                )}
                onClick={() => setSelectedType(report.type)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedType(report.type);
                  }
                }}
              >
                <div className="mb-2.5 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="bg-brand/10 shrink-0 rounded-lg p-1.5">
                      <Icon className="text-brand dark:text-brand h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm leading-tight font-semibold text-zinc-900 dark:text-white">
                        {report.title}
                      </h3>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                        {report.description}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 pl-1 text-right">
                    {previewLoading ? (
                      <Skeleton className="ml-auto h-7 w-8" />
                    ) : (
                      <>
                        <p className="text-brand text-lg leading-none font-bold tabular-nums sm:text-xl">
                          {count ?? '—'}
                        </p>
                        <p className="mt-0.5 text-[9px] tracking-wide text-zinc-400 uppercase dark:text-zinc-300">
                          reg.
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-auto flex gap-1.5">
                  <Button
                    size="sm"
                    className="min-w-0 flex-1"
                    loading={pdfLoading}
                    disabled={busy && !pdfLoading}
                    aria-label={`Descargar PDF de ${report.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDownload(report.type, report.hasDateRange, 'pdf');
                    }}
                  >
                    <FileText className="h-4 w-4" />
                    PDF
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="min-w-0 flex-1"
                    loading={csvLoading}
                    disabled={busy && !csvLoading}
                    aria-label={`Descargar CSV de ${report.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDownload(report.type, report.hasDateRange, 'csv');
                    }}
                  >
                    <Download className="h-4 w-4" />
                    CSV
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <Card padding="sm" rounded="xl" className="min-w-0">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                Vista previa · {selectedReport.title}
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {selectedReport.hasDateRange
                  ? `${formatSampleDate(from)} – ${formatSampleDate(to)}`
                  : 'Estado actual de miembros'}
                {typeof selectedCount === 'number' ? ` · ${selectedCount} registros` : ''}
              </p>
            </div>
          </div>

          {selectedType === 'payments' && (
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/70 px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-900/40">
                <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
                  Total USD
                </p>
                <p className="mt-0.5 text-sm font-bold text-zinc-900 tabular-nums dark:text-white">
                  {previewLoading ? '—' : formatMoney(preview?.paymentsTotalUsd ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/70 px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-900/40">
                <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
                  Aprobados
                </p>
                <p className="mt-0.5 text-sm font-bold text-zinc-900 tabular-nums dark:text-white">
                  {previewLoading ? '—' : (preview?.paymentsApproved ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/70 px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-900/40">
                <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
                  Pendientes
                </p>
                <p className="mt-0.5 text-sm font-bold text-zinc-900 tabular-nums dark:text-white">
                  {previewLoading ? '—' : (preview?.paymentsPending ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/70 px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-900/40">
                <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
                  Rechazados
                </p>
                <p className="mt-0.5 text-sm font-bold text-zinc-900 tabular-nums dark:text-white">
                  {previewLoading ? '—' : (preview?.paymentsRejected ?? 0)}
                </p>
              </div>
            </div>
          )}

          {previewLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : selectedType === 'retention' ? (
            <EmptyState
              icon={FileText}
              title={`${preview?.retention ?? 0} membresías vencidas/inactivas`}
              description="Descarga el PDF o CSV para el detalle de retención, no-shows y renovaciones."
              className="border-0 bg-transparent py-4 shadow-none"
            />
          ) : selectedType === 'payments' ? (
            (preview?.samples?.payments?.length ?? 0) === 0 ? (
              <EmptyState
                icon={DollarSign}
                title="Sin pagos en este rango"
                description="Prueba otro periodo o registra un pago en mostrador."
                className="border-0 bg-transparent py-4 shadow-none"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-500 dark:text-zinc-400">
                  <thead className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
                    <tr>
                      <th className="pr-2 pb-2">Fecha</th>
                      <th className="pr-2 pb-2">Miembro</th>
                      <th className="pr-2 pb-2 text-right">USD</th>
                      <th className="pb-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {preview?.samples?.payments.map((row, i) => (
                      <tr key={`${row.name}-${i}`}>
                        <td className="py-2 pr-2 whitespace-nowrap">
                          {formatSampleDate(row.date)}
                        </td>
                        <td className="max-w-[8rem] truncate py-2 pr-2 font-medium text-zinc-800 dark:text-zinc-100">
                          {row.name}
                        </td>
                        <td className="py-2 pr-2 text-right font-semibold text-zinc-900 tabular-nums dark:text-white">
                          ${row.amountUsd}
                        </td>
                        <td className="py-2">
                          <Badge variant={statusVariant(row.status)} className="text-[9px]">
                            {statusLabel(row.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : selectedType === 'attendance' ? (
            (preview?.samples?.attendance?.length ?? 0) === 0 ? (
              <EmptyState
                icon={Fingerprint}
                title="Sin asistencias en este rango"
                description="Los check-ins del mostrador aparecerán aquí."
                className="border-0 bg-transparent py-4 shadow-none"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-500 dark:text-zinc-400">
                  <thead className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
                    <tr>
                      <th className="pr-2 pb-2">Fecha</th>
                      <th className="pr-2 pb-2">Miembro</th>
                      <th className="pb-2 text-right">Min</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {preview?.samples?.attendance.map((row, i) => (
                      <tr key={`${row.name}-${i}`}>
                        <td className="py-2 pr-2 whitespace-nowrap">
                          {formatSampleDate(row.date)}
                        </td>
                        <td className="max-w-[10rem] truncate py-2 pr-2 font-medium text-zinc-800 dark:text-zinc-100">
                          {row.name}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {row.durationMinutes ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (preview?.samples?.members?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Users}
              title="Sin miembros"
              description="Cuando haya clientes registrados verás una muestra aquí."
              className="border-0 bg-transparent py-4 shadow-none"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-500 dark:text-zinc-400">
                <thead className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
                  <tr>
                    <th className="pr-2 pb-2">Miembro</th>
                    <th className="pr-2 pb-2">Plan</th>
                    <th className="pb-2 text-right">Días</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {preview?.samples?.members.map((row, i) => (
                    <tr key={`${row.name}-${i}`}>
                      <td className="max-w-[9rem] truncate py-2 pr-2 font-medium text-zinc-800 dark:text-zinc-100">
                        {row.name}
                      </td>
                      <td className="max-w-[7rem] truncate py-2 pr-2">
                        {row.membership || 'Sin plan'}
                      </td>
                      <td className="py-2 text-right tabular-nums">{row.daysRemaining ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 text-[10px] text-zinc-400 dark:text-zinc-500">
            Muestra de hasta 8 filas. El export incluye el conjunto completo del rango.
          </p>
        </Card>
      </div>

      <p className="flex items-start gap-2 px-0.5 text-[11px] text-zinc-500 sm:text-xs dark:text-zinc-400">
        <FileSpreadsheet className="text-brand mt-0.5 h-3.5 w-3.5 shrink-0" />
        PDF con marca GymApure para compartir; CSV UTF-8 para Excel y contabilidad. Se generan en el
        servidor al descargar.
      </p>
    </div>
  );
}
