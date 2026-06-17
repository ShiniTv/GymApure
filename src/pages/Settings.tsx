import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, parseJsonResponse, parseJsonSafe, toDisplayErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useAdminStats } from '../context/AdminStatsContext';
import {
  Mail,
  MessageSquare,
  Settings2,
  Save,
  Smartphone,
  Bell,
  Activity,
} from 'lucide-react';
import { Button, Card, Input, Label, PageHeader, Badge, Spinner } from '../components/ui';

interface ExpirySettingsForm {
  expiry_alert_days: number;
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
  whatsapp_notifications_enabled: boolean;
  notify_members_email: boolean;
  notify_members_sms: boolean;
  notify_members_whatsapp: boolean;
  notify_admin_email: boolean;
  notify_payment_events: boolean;
  notify_admin_new_payment: boolean;
  notify_routine_assigned: boolean;
  providers?: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    whatsappProvider?: 'meta' | 'twilio' | null;
    whatsappProviderLabel?: string | null;
  };
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

const NOTIFICATION_TOGGLES = [
  { key: 'email_notifications_enabled' as const, label: 'Email activo', icon: Mail },
  { key: 'whatsapp_notifications_enabled' as const, label: 'WhatsApp activo', icon: Smartphone },
  { key: 'sms_notifications_enabled' as const, label: 'SMS activo', icon: MessageSquare },
  { key: 'notify_members_email' as const, label: 'Email a miembros', icon: Mail },
  { key: 'notify_members_whatsapp' as const, label: 'WhatsApp a miembros', icon: Smartphone },
  { key: 'notify_members_sms' as const, label: 'SMS a miembros', icon: MessageSquare },
  { key: 'notify_admin_email' as const, label: 'Resumen admin', icon: Mail },
  { key: 'notify_payment_events' as const, label: 'Pagos (aprobado/rechazado)', icon: Bell },
  { key: 'notify_admin_new_payment' as const, label: 'Aviso pago nuevo', icon: Bell },
  { key: 'notify_routine_assigned' as const, label: 'Rutina asignada', icon: Bell },
];

export default function Settings() {
  const { user } = useAuth();
  const adminStats = useAdminStats();
  const [expirySettings, setExpirySettings] = useState<ExpirySettingsForm | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsMessageTone, setSettingsMessageTone] = useState<'success' | 'info' | 'error'>('info');
  const [testTarget, setTestTarget] = useState('');
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
    if (user?.role === 'admin' && user.email && !testTarget) {
      setTestTarget(user.email);
    }
  }, [user, testTarget]);

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
        result?: { emailsSent: number; smsSent: number; whatsappSent: number; markedExpired: number };
      }>(res);
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Error');
      const r = data.result;
      setSettingsMessageTone('success');
      setSettingsMessage(
        `Job ejecutado: ${r?.emailsSent ?? 0} emails, ${r?.whatsappSent ?? 0} WhatsApp, ${r?.smsSent ?? 0} SMS, ${r?.markedExpired ?? 0} vencidas`
      );
      await adminStats.refresh();
    } catch (err) {
      setSettingsMessageTone('error');
      setSettingsMessage(toDisplayErrorMessage(err, 'Error al ejecutar'));
    } finally {
      setSettingsSaving(false);
    }
  };

  const sendTestNotification = async (channel: 'email' | 'whatsapp' | 'sms') => {
    if (!testTarget.trim()) {
      setSettingsMessageTone('error');
      setSettingsMessage('Ingresa un email o teléfono para la prueba');
      return;
    }
    setSettingsSaving(true);
    setSettingsMessage('');
    try {
      const res = await apiFetch('/api/settings/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, target: testTarget.trim() }),
      });
      const data = await parseJsonResponse<{
        message?: string;
        success?: boolean;
        simulated?: boolean;
        mock?: boolean;
      }>(res);
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Error');
      if (data.success) {
        setSettingsMessageTone('success');
        setSettingsMessage(data.message ?? 'Mensaje enviado correctamente');
      } else if (data.simulated ?? data.mock) {
        setSettingsMessageTone('info');
        setSettingsMessage(data.message ?? 'Prueba simulada — configura credenciales en .env');
      } else {
        setSettingsMessageTone('error');
        setSettingsMessage(data.message ?? 'No se pudo enviar — revisa credenciales en .env');
      }
    } catch (err) {
      setSettingsMessageTone('error');
      setSettingsMessage(toDisplayErrorMessage(err, 'Error en prueba'));
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={<>Configuración <span className="text-orange-500">del sistema</span></>}
        subtitle="Notificaciones automáticas y salud operativa del servidor."
        action={
          <Link
            to="/"
            className="text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-orange-500"
          >
            ← Volver al dashboard
          </Link>
        }
      />

      {expirySettings && (
        <Card padding="lg" rounded="3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-orange-500" />
              Notificaciones
            </h2>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={runExpiryJobNow} disabled={settingsSaving}>
                Ejecutar ahora
              </Button>
              <Button type="button" size="sm" onClick={saveExpirySettings} disabled={settingsSaving}>
                <Save className="h-3.5 w-3.5" />
                Guardar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="expiry_alert_days">Días de anticipación</Label>
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

            {NOTIFICATION_TOGGLES.map(({ key, label, icon: Icon }) => (
              <label
                key={key}
                className="flex items-center gap-3 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={expirySettings[key]}
                  onChange={(e) =>
                    setExpirySettings({ ...expirySettings, [key]: e.target.checked })
                  }
                  className="h-4 w-4 rounded accent-orange-500"
                />
                <Icon className="h-4 w-4 text-zinc-400 shrink-0" />
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{label}</span>
              </label>
            ))}
          </div>

          {expirySettings.providers && (
            <div className="flex flex-wrap gap-3 mt-6">
              {[
                { label: 'SMTP', ok: expirySettings.providers.email, detail: null },
                {
                  label: 'WhatsApp',
                  ok: expirySettings.providers.whatsapp,
                  detail: expirySettings.providers.whatsappProviderLabel,
                },
                { label: 'SMS', ok: expirySettings.providers.sms, detail: null },
              ].map(({ label, ok, detail }) => (
                <span key={label}>
                  <Badge variant={ok ? 'success' : 'default'}>
                    {label}
                    {detail ? ` (${detail})` : ''}: {ok ? 'Configurado' : 'Sin credenciales'}
                  </Badge>
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
              Enviar prueba
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="text"
                placeholder="email@ejemplo.com o +58412…"
                value={testTarget}
                onChange={(e) => setTestTarget(e.target.value)}
                className="flex-1"
              />
              <Button type="button" variant="secondary" size="sm" disabled={settingsSaving} onClick={() => sendTestNotification('email')}>
                Probar email
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={settingsSaving}
                className="bg-emerald-600 hover:bg-emerald-500"
                onClick={() => sendTestNotification('whatsapp')}
              >
                Probar WhatsApp
              </Button>
            </div>
          </div>

          {settingsMessage && (
            <p
              className={`text-xs font-bold mt-4 ${
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

      <Card padding="lg" rounded="3xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-500" />
            Salud operativa
          </h2>
          {opsMetrics && (
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => downloadMetricsExport('json')}>
                Export JSON
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => downloadMetricsExport('csv')}>
                Export CSV
              </Button>
              <Badge variant={opsMetrics.status === 'ok' ? 'success' : 'danger'}>
                {opsMetrics.status === 'ok' ? 'Estable' : 'Degradado'}
              </Badge>
            </div>
          )}
        </div>

        {opsMetricsLoading && !opsMetrics && !opsMetricsError ? (
          <p className="text-sm text-zinc-500">Cargando métricas…</p>
        ) : !opsMetrics && opsMetricsError ? (
          <p className="text-sm font-bold text-red-600 dark:text-red-400">{opsMetricsError}</p>
        ) : opsMetrics ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">DB ms</p>
                <p className="text-lg font-black text-zinc-900 dark:text-white">
                  {opsMetrics.db.latency_ms ?? '—'}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Avg req ms</p>
                <p className="text-lg font-black text-zinc-900 dark:text-white">
                  {opsMetrics.request_metrics.avgResponseMs}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Error rate</p>
                <p
                  className={`text-lg font-black ${
                    opsMetrics.request_metrics.thresholdStatus.errorRate === 'warn'
                      ? 'text-red-500'
                      : 'text-emerald-500'
                  }`}
                >
                  {opsMetrics.request_metrics.errorRatePercent}%
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Slow rate</p>
                <p
                  className={`text-lg font-black ${
                    opsMetrics.request_metrics.thresholdStatus.slowRate === 'warn'
                      ? 'text-orange-500'
                      : 'text-emerald-500'
                  }`}
                >
                  {opsMetrics.request_metrics.slowRatePercent}%
                </p>
              </div>
            </div>

            {opsMetrics.request_metrics.topSlowRoutes.length > 0 && (
              <div className="mt-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">
                  Top rutas lentas
                </p>
                <div className="space-y-2">
                  {opsMetrics.request_metrics.topSlowRoutes.map((route) => (
                    <div
                      key={`${route.method}-${route.path}`}
                      className="rounded-xl border border-zinc-100 dark:border-zinc-800 px-3 py-2"
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        {route.method} {route.path}
                      </p>
                      <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                        avg {route.avgDurationMs}ms · max {route.maxDurationMs}ms · {route.count} req
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">
                Alertas activas
              </p>
              {opsAlerts.length === 0 ? (
                <p className="text-xs font-bold text-emerald-600">Sin alertas. Operación normal.</p>
              ) : (
                <div className="space-y-2">
                  {opsAlerts.map((alert) => (
                    <div key={alert} className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2">
                      <p className="text-xs font-bold text-red-600 dark:text-red-400">{alert}</p>
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
