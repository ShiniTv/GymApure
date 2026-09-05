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
        <h2 className="text-text flex min-w-0 items-center gap-2 text-sm font-bold">
          <Activity className="text-brand h-4 w-4 shrink-0" />
          <span className="truncate">Salud operativa</span>
        </h2>
        {opsMetrics && (
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="secondary"
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
              variant="secondary"
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
        <p className="text-danger dark:text-danger text-xs font-bold">{opsMetricsError}</p>
      ) : opsMetrics ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <div className="border-border-subtle min-w-0 rounded-lg border px-2.5 py-2">
              <p className="text-text-muted text-small font-medium tracking-wide uppercase">
                DB ms
              </p>
              <p className="text-text mt-0.5 text-base font-bold tabular-nums sm:text-lg">
                {opsMetrics.db.latency_ms ?? '—'}
              </p>
            </div>
            <div className="border-border-subtle min-w-0 rounded-lg border px-2.5 py-2">
              <p className="text-text-muted text-small font-medium tracking-wide uppercase">
                Avg req ms
              </p>
              <p className="text-text mt-0.5 text-base font-bold tabular-nums sm:text-lg">
                {opsMetrics.request_metrics.avgResponseMs}
              </p>
            </div>
            <div className="border-border-subtle min-w-0 rounded-lg border px-2.5 py-2">
              <p className="text-text-muted text-small font-medium tracking-wide uppercase">
                Error rate
              </p>
              <p
                className={`mt-0.5 text-base font-bold tabular-nums sm:text-lg ${
                  opsMetrics.request_metrics.thresholdStatus.errorRate === 'warn'
                    ? 'text-danger'
                    : 'text-emerald-500'
                }`}
              >
                {opsMetrics.request_metrics.errorRatePercent}%
              </p>
            </div>
            <div className="border-border-subtle min-w-0 rounded-lg border px-2.5 py-2">
              <p className="text-text-muted text-small font-medium tracking-wide uppercase">
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
              <p className="text-text-muted text-small mb-1.5 font-medium tracking-wide uppercase">
                Top rutas lentas
              </p>
              <div className="space-y-1.5">
                {opsMetrics.request_metrics.topSlowRoutes.map((route) => (
                  <div
                    key={`${route.method}-${route.path}`}
                    className="border-border-subtle min-w-0 rounded-lg border px-2.5 py-2"
                  >
                    <p className="text-text-muted text-small truncate font-medium">
                      {route.method} {route.path}
                    </p>
                    <p className="text-text-secondary mt-0.5 text-xs tabular-nums">
                      avg {route.avgDurationMs}ms · max {route.maxDurationMs}ms · {route.count} req
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 min-w-0">
            <p className="text-text-muted text-small mb-1.5 font-medium tracking-wide uppercase">
              Alertas activas
            </p>
            {opsAlerts.length === 0 ? (
              <p className="text-small font-bold text-emerald-600">
                Sin alertas. Operación normal.
              </p>
            ) : (
              <div className="space-y-1.5">
                {opsAlerts.map((alert) => (
                  <div
                    key={alert}
                    className="border-danger/20 rounded-lg border bg-red-500/5 px-2.5 py-2"
                  >
                    <p className="text-small text-danger dark:text-danger font-bold">{alert}</p>
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
