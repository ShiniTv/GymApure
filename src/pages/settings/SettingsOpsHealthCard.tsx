import { Activity, FileJson, FileSpreadsheet } from 'lucide-react';
import { Badge, Button, Card, Skeleton } from '../../components/ui';

export interface HealthMetricsResponse {
  status: 'ok' | 'degraded';
  request_metrics: {
    avgResponseMs: number;
    errorRatePercent: number;
    slowRatePercent: number;
    thresholdStatus: {
      errorRate: 'ok' | 'warn';
      slowRate: 'ok' | 'warn';
    };
    thresholds: {
      warnErrorRatePercent: number;
      warnSlowRatePercent: number;
    };
    topSlowRoutes: {
      method: string;
      path: string;
      count: number;
      avgDurationMs: number;
      maxDurationMs: number;
    }[];
    recentTimeline?: {
      ts: number;
      errorRatePercent: number;
      slowRatePercent: number;
    }[];
  };
  db: {
    status?: 'up' | 'down';
    latency_ms: number | null;
  };
}

interface SettingsOpsHealthCardProps {
  opsMetrics: HealthMetricsResponse | null;
  opsMetricsLoading: boolean;
  opsMetricsError: string | null;
  opsAlerts: string[];
  onExportJson: () => void;
  onExportCsv: () => void;
}

export function SettingsOpsHealthCard({
  opsMetrics,
  opsMetricsLoading,
  opsMetricsError,
  opsAlerts,
  onExportJson,
  onExportCsv,
}: SettingsOpsHealthCardProps) {
  return (
    <Card
      id="salud-operativa"
      padding="sm"
      rounded="xl"
      className="min-w-0 scroll-mt-20 overflow-hidden md:p-4"
    >
      <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
          <Activity className="text-brand h-4 w-4 shrink-0" />
          <span className="truncate">Salud operativa</span>
        </h2>
        {opsMetrics && (
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 min-h-9 w-9 min-w-9 shrink-0 p-0"
              onClick={onExportJson}
              aria-label="Export JSON"
              title="Export JSON"
            >
              <FileJson className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 min-h-9 w-9 min-w-9 shrink-0 p-0"
              onClick={onExportCsv}
              aria-label="Export CSV"
              title="Export CSV"
            >
              <FileSpreadsheet className="h-4 w-4" />
            </Button>
            <Badge variant={opsMetrics.status === 'ok' ? 'success' : 'danger'}>
              {opsMetrics.status === 'ok' ? 'Estable' : 'Degradado'}
            </Badge>
          </div>
        )}
      </div>

      {opsMetricsLoading && !opsMetrics && !opsMetricsError ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !opsMetrics && opsMetricsError ? (
        <p className="text-xs font-bold text-red-600 dark:text-red-400">{opsMetricsError}</p>
      ) : opsMetrics ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <div className="min-w-0 rounded-lg border border-zinc-100 px-2.5 py-2 dark:border-zinc-800">
              <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                DB ms
              </p>
              <p className="mt-0.5 text-base font-bold text-zinc-900 tabular-nums sm:text-lg dark:text-white">
                {opsMetrics.db.latency_ms ?? '—'}
              </p>
            </div>
            <div className="min-w-0 rounded-lg border border-zinc-100 px-2.5 py-2 dark:border-zinc-800">
              <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Avg req ms
              </p>
              <p className="mt-0.5 text-base font-bold text-zinc-900 tabular-nums sm:text-lg dark:text-white">
                {opsMetrics.request_metrics.avgResponseMs}
              </p>
            </div>
            <div className="min-w-0 rounded-lg border border-zinc-100 px-2.5 py-2 dark:border-zinc-800">
              <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Error rate
              </p>
              <p
                className={`mt-0.5 text-base font-bold tabular-nums sm:text-lg ${
                  opsMetrics.request_metrics.thresholdStatus.errorRate === 'warn'
                    ? 'text-red-500'
                    : 'text-emerald-500'
                }`}
              >
                {opsMetrics.request_metrics.errorRatePercent}%
              </p>
            </div>
            <div className="min-w-0 rounded-lg border border-zinc-100 px-2.5 py-2 dark:border-zinc-800">
              <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Slow rate
              </p>
              <p
                className={`mt-0.5 text-base font-bold tabular-nums sm:text-lg ${
                  opsMetrics.request_metrics.thresholdStatus.slowRate === 'warn'
                    ? 'text-brand'
                    : 'text-emerald-500'
                }`}
              >
                {opsMetrics.request_metrics.slowRatePercent}%
              </p>
            </div>
          </div>

          {opsMetrics.request_metrics.topSlowRoutes.length > 0 && (
            <div className="mt-4 min-w-0">
              <p className="mb-1.5 text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Top rutas lentas
              </p>
              <div className="space-y-1.5">
                {opsMetrics.request_metrics.topSlowRoutes.map((route) => (
                  <div
                    key={`${route.method}-${route.path}`}
                    className="min-w-0 rounded-lg border border-zinc-100 px-2.5 py-2 dark:border-zinc-800"
                  >
                    <p className="truncate text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      {route.method} {route.path}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-700 tabular-nums dark:text-zinc-200">
                      avg {route.avgDurationMs}ms · max {route.maxDurationMs}ms · {route.count} req
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 min-w-0">
            <p className="mb-1.5 text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Alertas activas
            </p>
            {opsAlerts.length === 0 ? (
              <p className="text-[11px] font-bold text-emerald-600">
                Sin alertas. Operación normal.
              </p>
            ) : (
              <div className="space-y-1.5">
                {opsAlerts.map((alert) => (
                  <div
                    key={alert}
                    className="rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-2"
                  >
                    <p className="text-[11px] font-bold text-red-600 dark:text-red-400">{alert}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </Card>
  );
}
