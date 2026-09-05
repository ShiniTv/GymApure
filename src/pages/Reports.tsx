import { useState, useEffect } from 'react';

import { downloadReport, apiFetch, parseJsonResponse } from '../lib/api';
import { useDebouncedValue } from '../lib/useDebouncedValue';
import { cn, formatMoney } from '../lib/utils';

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
  FilterChips,
} from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';
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

type ReportType = 'payments' | 'attendance' | 'members' | 'retention' | 'reconciliation';
type ReportFormat = 'csv' | 'pdf';

interface ReportPreview {
  payments: number;
  attendance: number;
  members: number;
  retention?: number;
  reconciliation?: number;
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
  previewKey: keyof Pick<
    ReportPreview,
    'payments' | 'attendance' | 'members' | 'retention' | 'reconciliation'
  >;
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
  {
    type: 'reconciliation',
    title: 'Conciliación',
    description: 'Pendientes viejos, activos sin pago y pagos sin membresía.',
    icon: FileSpreadsheet,
    hasDateRange: true,
    previewKey: 'reconciliation',
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

  const rangePreset =
    from === format(subDays(new Date(), 7), 'yyyy-MM-dd') && to === today
      ? '7'
      : from === format(subDays(new Date(), 30), 'yyyy-MM-dd') && to === today
        ? '30'
        : from === format(startOfMonth(new Date()), 'yyyy-MM-dd') && to === today
          ? 'month'
          : '';

  return (
    <div className="page-stack-tight mx-auto w-full max-w-7xl">
      <PageHeader
        compact
        title={<>Reportes</>}
        subtitle="PDF / CSV por rango · vista previa"
        action={<BackToDashboardLink iconOnly />}
      />

      {error && (
        <Card padding="sm" className="border-danger/30 bg-red-500/10">
          <p className="text-danger dark:text-danger text-sm font-bold">{error}</p>
        </Card>
      )}

      <Card padding="sm" rounded="xl">
        <div className="mb-2.5 flex items-center gap-2">
          <Calendar className="text-brand h-3.5 w-3.5 shrink-0" />
          <h2 className="text-text text-sm font-semibold">Rango de fechas</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0">
            <Label className="text-small">Desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="min-w-0">
            <Label className="text-small">Hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="mt-2.5">
          <FilterChips
            options={[
              { value: '7', label: '7 días' },
              { value: '30', label: '30 días' },
              { value: 'month', label: 'Este mes' },
            ]}
            value={rangePreset}
            onChange={(v) => {
              if (v === '7') setLastDays(7);
              else if (v === '30') setLastDays(30);
              else if (v === 'month') setCurrentMonth();
            }}
          />
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] lg:items-start">
        <div className="border-border/80 bg-surface overflow-hidden rounded-[var(--radius-card)] border">
          {REPORTS.map((report, index) => {
            const Icon = report.icon;
            const count = preview?.[report.previewKey];
            const pdfLoading = downloading?.type === report.type && downloading.format === 'pdf';
            const csvLoading = downloading?.type === report.type && downloading.format === 'csv';
            const busy = downloading?.type === report.type;
            const selected = selectedType === report.type;

            return (
              <div
                key={report.type}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`Vista previa de ${report.title}`}
                className={cn(
                  'cursor-pointer px-3 py-2.5 transition-colors',
                  index > 0 && 'border-border/60 border-t',
                  selected ? 'bg-brand/[0.06]' : 'hover:bg-surface-overlay/50'
                )}
                onClick={() => setSelectedType(report.type)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedType(report.type);
                  }
                }}
              >
                <div className="flex items-start gap-2.5">
                  <div className="bg-brand/10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="text-brand h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="text-text min-w-0 flex-1 truncate text-sm font-semibold">
                        {report.title}
                      </h3>
                      {previewLoading ? (
                        <Skeleton className="h-4 w-8" />
                      ) : (
                        <span className="text-brand text-small shrink-0 font-semibold tabular-nums">
                          {count ?? '—'}
                          <span className="text-text-muted text-small ml-1 font-medium">reg.</span>
                        </span>
                      )}
                    </div>
                    <p className="text-text-muted text-small mt-0.5 truncate leading-snug">
                      {report.description}
                    </p>
                    <div className="mt-2 flex gap-1.5">
                      <Button
                        size="sm"
                        className="text-small h-8 min-h-8 gap-1 px-2.5"
                        loading={pdfLoading}
                        disabled={busy && !pdfLoading}
                        aria-label={`Descargar PDF de ${report.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDownload(report.type, report.hasDateRange, 'pdf');
                        }}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-small h-8 min-h-8 gap-1 px-2.5"
                        loading={csvLoading}
                        disabled={busy && !csvLoading}
                        aria-label={`Descargar CSV de ${report.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDownload(report.type, report.hasDateRange, 'csv');
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
                        CSV
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Card padding="sm" rounded="xl" className="min-w-0">
          <div className="mb-2.5 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-text text-sm font-semibold">
                Vista previa · {selectedReport.title}
              </h2>
              <p className="text-text-muted text-small">
                {selectedReport.hasDateRange
                  ? `${formatSampleDate(from)} – ${formatSampleDate(to)}`
                  : 'Estado actual de miembros'}
                {typeof selectedCount === 'number' ? ` · ${selectedCount} reg.` : ''}
              </p>
            </div>
          </div>

          {selectedType === 'payments' && (
            <div className="mb-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              <div className="border-border/70 rounded-lg border px-2.5 py-2">
                <p className="text-text-muted text-small font-medium tracking-wide uppercase">
                  Total USD
                </p>
                <p className="text-text mt-0.5 text-sm font-bold tabular-nums">
                  {previewLoading ? '—' : formatMoney(preview?.paymentsTotalUsd ?? 0)}
                </p>
              </div>
              <div className="border-border/70 rounded-lg border px-2.5 py-2">
                <p className="text-text-muted text-small font-medium tracking-wide uppercase">
                  Aprobados
                </p>
                <p className="text-text mt-0.5 text-sm font-bold tabular-nums">
                  {previewLoading ? '—' : (preview?.paymentsApproved ?? 0)}
                </p>
              </div>
              <div className="border-border/70 rounded-lg border px-2.5 py-2">
                <p className="text-text-muted text-small font-medium tracking-wide uppercase">
                  Pendientes
                </p>
                <p className="text-text mt-0.5 text-sm font-bold tabular-nums">
                  {previewLoading ? '—' : (preview?.paymentsPending ?? 0)}
                </p>
              </div>
              <div className="border-border/70 rounded-lg border px-2.5 py-2">
                <p className="text-text-muted text-small font-medium tracking-wide uppercase">
                  Rechazados
                </p>
                <p className="text-text mt-0.5 text-sm font-bold tabular-nums">
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
              compact
              icon={FileText}
              title={`${preview?.retention ?? 0} membresías vencidas/inactivas`}
              description="Descarga PDF o CSV para el detalle."
              className="border-0 bg-transparent py-3 shadow-none"
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
                <table className="text-text-muted w-full text-left text-xs">
                  <thead className="text-text-muted text-small font-semibold tracking-wide uppercase">
                    <tr>
                      <th className="pr-2 pb-2">Fecha</th>
                      <th className="pr-2 pb-2">Miembro</th>
                      <th className="pr-2 pb-2 text-right">USD</th>
                      <th className="pb-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border-subtle divide-y">
                    {preview?.samples?.payments.map((row, i) => (
                      <tr key={`${row.name}-${i}`}>
                        <td className="py-2 pr-2 whitespace-nowrap">
                          {formatSampleDate(row.date)}
                        </td>
                        <td className="text-text max-w-[8rem] truncate py-2 pr-2 font-medium">
                          {row.name}
                        </td>
                        <td className="text-text py-2 pr-2 text-right font-semibold tabular-nums">
                          ${row.amountUsd}
                        </td>
                        <td className="py-2">
                          <Badge variant={statusVariant(row.status)} className="text-small">
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
                description="Los accesos del mostrador aparecerán aquí."
                className="border-0 bg-transparent py-4 shadow-none"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="text-text-muted w-full text-left text-xs">
                  <thead className="text-text-muted text-small font-semibold tracking-wide uppercase">
                    <tr>
                      <th className="pr-2 pb-2">Fecha</th>
                      <th className="pr-2 pb-2">Miembro</th>
                      <th className="pb-2 text-right">Min</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border-subtle divide-y">
                    {preview?.samples?.attendance.map((row, i) => (
                      <tr key={`${row.name}-${i}`}>
                        <td className="py-2 pr-2 whitespace-nowrap">
                          {formatSampleDate(row.date)}
                        </td>
                        <td className="text-text max-w-[10rem] truncate py-2 pr-2 font-medium">
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
              <table className="text-text-muted w-full text-left text-xs">
                <thead className="text-text-muted text-small font-semibold tracking-wide uppercase">
                  <tr>
                    <th className="pr-2 pb-2">Miembro</th>
                    <th className="pr-2 pb-2">Plan</th>
                    <th className="pb-2 text-right">Días</th>
                  </tr>
                </thead>
                <tbody className="divide-border-subtle divide-y">
                  {preview?.samples?.members.map((row, i) => (
                    <tr key={`${row.name}-${i}`}>
                      <td className="text-text max-w-[9rem] truncate py-2 pr-2 font-medium">
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

          <p className="text-text-muted text-small mt-3">
            Muestra de hasta 8 filas. El export incluye el conjunto completo del rango.
          </p>
        </Card>
      </div>

      <p className="text-text-muted text-small flex items-start gap-2 px-0.5 sm:text-xs">
        <FileSpreadsheet className="text-brand mt-0.5 h-3.5 w-3.5 shrink-0" />
        PDF con marca GymApure para compartir; CSV UTF-8 para Excel y contabilidad. Se generan en el
        servidor al descargar.
      </p>
    </div>
  );
}
