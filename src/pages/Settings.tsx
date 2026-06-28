import { useState, useEffect } from 'react';
import { apiFetch, parseJsonResponse, parseJsonSafe, toDisplayErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useAdminStats } from '../context/AdminStatsContext';
import { Settings2, Save, Activity, Zap, FileJson, FileSpreadsheet } from 'lucide-react';
import { Button, Card, Input, Label, PageHeader, Badge, Spinner, BackToDashboardLink } from '../components/ui';

interface ExpirySettingsForm {
  expiry_alert_days: number;
}

interface HealthMetricsResponse {
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
    recentTimeline: {
      ts: number;
      errorRatePercent: number;
      slowRatePercent: number;
    }[];
  };
  db: {
    status: 'up' | 'down';
    latency_ms: number | null;
  };
}

export default function Settings() {
  const { user } = useAuth();
  const adminStats = useAdminStats();
  const [expirySettings, setExpirySettings] = useState<ExpirySettingsForm | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsMessageTone, setSettingsMessageTone] = useState<'success' | 'info' | 'error'>('info');
  const [opsMetrics, setOpsMetrics] = useState<HealthMetricsResponse | null>(null);
  const [opsMetricsError, setOpsMetricsError] = useState<string | null>(null);
  const [opsMetricsLoading, setOpsMetricsLoading] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') return;

    apiFetch('/api/settings/expiry')
      .then((res) => parseJsonResponse<ExpirySettingsForm>(res))
      .then((data) => setExpirySettings(data))
      .catch(() => setExpirySettings(null))
      .finally(() => setSettingsLoading(false));
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== 'admin') return;

    let active = true;
    const loadMetrics = async () => {
      if (active) setOpsMetricsLoading(true);
      try {
        const res = await apiFetch('/api/health/metrics');
        const data = await parseJsonResponse<HealthMetricsResponse>(res);
        if (!active) return;
        setOpsMetrics(data);
        setOpsMetricsError(null);
      } catch (err) {
        if (!active) return;
        setOpsMetrics(null);
        setOpsMetricsError(toDisplayErrorMessage(err));
      } finally {
        if (active) setOpsMetricsLoading(false);
      }
    };

    void loadMetrics();
    const interval = window.setInterval(() => void loadMetrics(), 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [user?.role]);

  const saveExpirySettings = async () => {
    if (!expirySettings) return;
    setSettingsSaving(true);
    setSettingsMessage('');
    try {
      const res = await apiFetch('/api/settings/expiry', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expirySettings),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Error al guardar');
      setExpirySettings(data as ExpirySettingsForm);
      setSettingsMessageTone('success');
      setSettingsMessage('Configuración guardada');
      await adminStats.refresh();
    } catch (err) {
      setSettingsMessageTone('error');
      setSettingsMessage(toDisplayErrorMessage(err, 'Error al guardar'));
    } finally {
      setSettingsSaving(false);
    }
  };

  const runExpiryJobNow = async () => {
    setSettingsSaving(true);
    setSettingsMessage('');
    try {
      const res = await apiFetch('/api/settings/expiry/run', { method: 'POST' });
      const data = await parseJsonResponse<{
        result?: { messagesSent: number; markedExpired: number; skipped: number };
      }>(res);
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Error');
      const r = data.result;
      setSettingsMessageTone('success');
      setSettingsMessage(
        `Job ejecutado: ${r?.messagesSent ?? 0} mensajes en chat, ${r?.markedExpired ?? 0} vencidas, ${r?.skipped ?? 0} omitidos`
      );
      await adminStats.refresh();
    } catch (err) {
      setSettingsMessageTone('error');
      setSettingsMessage(toDisplayErrorMessage(err, 'Error al ejecutar'));
    } finally {
      setSettingsSaving(false);
    }
  };

  const downloadMetricsExport = async (format: 'json' | 'csv') => {
    try {
      const res = await apiFetch(`/api/health/metrics/export?format=${format}`);
      if (!res.ok) {
        const data = await parseJsonSafe<{ error?: string; requestId?: string }>(res);
        throw new Error(
          data.requestId ? `${data.error ?? 'No se pudo exportar'} (req: ${data.requestId})` : data.error ?? 'No se pudo exportar'
        );
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `metrics.${format}`;
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setSettingsMessageTone('error');
      setSettingsMessage(`No se pudo descargar métricas: ${toDisplayErrorMessage(err)}`);
    }
  };

  const opsAlerts =
    opsMetrics
      ? [
          ...(opsMetrics.request_metrics.thresholdStatus.errorRate === 'warn'
            ? [`Error rate en ${opsMetrics.request_metrics.errorRatePercent}%`]
            : []),
          ...(opsMetrics.request_metrics.thresholdStatus.slowRate === 'warn'
            ? [`Slow rate en ${opsMetrics.request_metrics.slowRatePercent}%`]
            : []),
          ...(opsMetrics.db.status === 'down' ? ['Base de datos degradada'] : []),
        ]
      : [];

  if (settingsLoading) {
    return (
      <div className="page-state-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="page-stack-tight">
      <PageHeader
        compact
        title={<>Configuración <span className="text-brand">del sistema</span></>}
        subtitle="Avisos de chat y salud operativa."
        action={<BackToDashboardLink />}
      />

      {expirySettings && (
        <Card padding="sm" rounded="xl" className="panel-wide">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2 min-w-0">
              <Settings2 className="h-4 w-4 text-brand shrink-0" />
              <span className="truncate">Avisos de membresía</span>
            </h2>
            <div className="flex gap-1.5 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 px-0"
                onClick={runExpiryJobNow}
                disabled={settingsSaving}
                aria-label="Ejecutar avisos ahora"
                title="Ejecutar avisos ahora"
              >
                <Zap className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 w-9 px-0"
                onClick={saveExpirySettings}
                disabled={settingsSaving}
                aria-label="Guardar"
                title="Guardar"
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mb-3 leading-snug">
            Vencimiento, pagos y rutinas se envían al chat de cada miembro.
          </p>

          <div className="max-w-[8rem]">
            <Label htmlFor="expiry_alert_days" className="text-[11px]">
              Días de anticipación
            </Label>
            <Input
              id="expiry_alert_days"
              type="number"
              min={1}
              max={90}
              value={expirySettings.expiry_alert_days}
              onChange={(e) =>
                setExpirySettings({
                  ...expirySettings,
                  expiry_alert_days: Math.min(90, Math.max(1, parseInt(e.target.value, 10) || 1)),
                })
              }
            />
          </div>

          {settingsMessage && (
            <p
              className={`text-[11px] font-bold mt-3 leading-snug ${
                settingsMessageTone === 'success'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : settingsMessageTone === 'info'
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-red-600 dark:text-red-400'
              }`}
            >
              {settingsMessage}
            </p>
          )}
        </Card>
      )}

      <Card padding="sm" rounded="xl" className="panel-wide">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand shrink-0" />
            Salud operativa
          </h2>
          {opsMetrics && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 px-0"
                onClick={() => downloadMetricsExport('json')}
                aria-label="Export JSON"
                title="Export JSON"
              >
                <FileJson className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 px-0"
                onClick={() => downloadMetricsExport('csv')}
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
          <p className="text-xs text-zinc-500">Cargando métricas…</p>
        ) : !opsMetrics && opsMetricsError ? (
          <p className="text-xs font-bold text-red-600 dark:text-red-400">{opsMetricsError}</p>
        ) : opsMetrics ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 px-2.5 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">DB ms</p>
                <p className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tabular-nums mt-0.5">
                  {opsMetrics.db.latency_ms ?? '—'}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 px-2.5 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Avg req ms</p>
                <p className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tabular-nums mt-0.5">
                  {opsMetrics.request_metrics.avgResponseMs}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 px-2.5 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Error rate</p>
                <p
                  className={`text-base sm:text-lg font-bold tabular-nums mt-0.5 ${
                    opsMetrics.request_metrics.thresholdStatus.errorRate === 'warn'
                      ? 'text-red-500'
                      : 'text-emerald-500'
                  }`}
                >
                  {opsMetrics.request_metrics.errorRatePercent}%
                </p>
              </div>
              <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 px-2.5 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Slow rate</p>
                <p
                  className={`text-base sm:text-lg font-bold tabular-nums mt-0.5 ${
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
              <div className="mt-4">
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 mb-1.5">
                  Top rutas lentas
                </p>
                <div className="space-y-1.5">
                  {opsMetrics.request_metrics.topSlowRoutes.map((route) => (
                    <div
                      key={`${route.method}-${route.path}`}
                      className="rounded-lg border border-zinc-100 dark:border-zinc-800 px-2.5 py-2"
                    >
                      <p className="text-[11px] font-medium text-zinc-500 truncate">
                        {route.method} {route.path}
                      </p>
                      <p className="text-xs text-zinc-700 dark:text-zinc-200 mt-0.5 tabular-nums">
                        avg {route.avgDurationMs}ms · max {route.maxDurationMs}ms · {route.count} req
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 mb-1.5">
                Alertas activas
              </p>
              {opsAlerts.length === 0 ? (
                <p className="text-[11px] font-bold text-emerald-600">Sin alertas. Operación normal.</p>
              ) : (
                <div className="space-y-1.5">
                  {opsAlerts.map((alert) => (
                    <div key={alert} className="rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-2">
                      <p className="text-[11px] font-bold text-red-600 dark:text-red-400">{alert}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </Card>
    </div>
  );
}
