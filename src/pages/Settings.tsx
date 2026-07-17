import { useState, useEffect } from 'react';
import { apiFetch, parseJsonResponse, parseJsonSafe, toDisplayErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useAdminStats } from '../context/AdminStatsContext';
import {
  Settings2,
  Save,
  Activity,
  Zap,
  FileJson,
  FileSpreadsheet,
  DollarSign,
  RefreshCw,
  Fingerprint,
} from 'lucide-react';
import {
  Button,
  Card,
  Input,
  Label,
  PageHeader,
  Badge,
  Skeleton,
  BackToDashboardLink,
} from '../components/ui';
import { PushNotificationsToggle } from '../components/PushNotificationsToggle';
import { usePageTitle } from '../hooks/usePageTitle';

interface ExpirySettingsForm {
  expiry_alert_days: number;
}

interface ExchangeRateAdminView {
  active: {
    currency: 'USD';
    rate: number;
    effective_date: string;
    source: 'bcv' | 'manual';
    fetched_at: string;
  } | null;
  override: {
    rate: number | null;
    note: string;
  };
  history: {
    id: number;
    rate: number;
    effective_date: string;
    fetched_at: string;
  }[];
}

interface ExchangeRateForm {
  override_rate: string;
  override_note: string;
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
  usePageTitle('Configuración');
  const adminStats = useAdminStats();
  const [expirySettings, setExpirySettings] = useState<ExpirySettingsForm | null>(null);
  const [checkInPinForm, setCheckInPinForm] = useState({
    check_in_pin: '',
    require_self_check_in_pin: false,
  });
  const [emailConfigured, setEmailConfigured] = useState<boolean | null>(null);
  const [exchangeRateView, setExchangeRateView] = useState<ExchangeRateAdminView | null>(null);
  const [exchangeRateForm, setExchangeRateForm] = useState<ExchangeRateForm>({
    override_rate: '',
    override_note: '',
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsLoadError, setSettingsLoadError] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsMessageTone, setSettingsMessageTone] = useState<'success' | 'info' | 'error'>(
    'info'
  );
  const [opsMetrics, setOpsMetrics] = useState<HealthMetricsResponse | null>(null);
  const [opsMetricsError, setOpsMetricsError] = useState<string | null>(null);
  const [opsMetricsLoading, setOpsMetricsLoading] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') return;

    apiFetch('/api/settings/expiry')
      .then((res) => parseJsonResponse<ExpirySettingsForm>(res))
      .then((data) => {
        setExpirySettings(data);
        setSettingsLoadError(false);
      })
      .catch(() => {
        setExpirySettings(null);
        setSettingsLoadError(true);
      })
      .finally(() => setSettingsLoading(false));

    apiFetch('/api/settings/check-in-pin')
      .then((res) =>
        parseJsonResponse<{ check_in_pin?: string; require_self_check_in_pin?: boolean }>(res)
      )
      .then((data) => {
        setCheckInPinForm({
          check_in_pin: data.check_in_pin ?? '',
          require_self_check_in_pin: Boolean(data.require_self_check_in_pin),
        });
      })
      .catch(() => {
        /* optional */
      });

    apiFetch('/api/health/ops')
      .then((res) => parseJsonSafe<{ email?: { configured?: boolean } }>(res))
      .then((data) => {
        if (typeof data.email?.configured === 'boolean') {
          setEmailConfigured(data.email.configured);
        } else {
          setEmailConfigured(null);
        }
      })
      .catch(() => setEmailConfigured(null));

    apiFetch('/api/settings/exchange-rate')
      .then((res) => parseJsonResponse<ExchangeRateAdminView>(res))
      .then((data) => {
        setExchangeRateView(data);
        setExchangeRateForm({
          override_rate: data.override.rate != null ? String(data.override.rate) : '',
          override_note: data.override.note ?? '',
        });
      })
      .catch(() => {
        setExchangeRateView(null);
      });
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

  const saveCheckInPin = async () => {
    setSettingsSaving(true);
    setSettingsMessage('');
    try {
      const res = await apiFetch('/api/settings/check-in-pin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkInPinForm),
      });
      const data = await parseJsonResponse<{
        check_in_pin?: string;
        require_self_check_in_pin?: boolean;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error || 'Error al guardar PIN');
      setCheckInPinForm({
        check_in_pin: data.check_in_pin ?? '',
        require_self_check_in_pin: Boolean(data.require_self_check_in_pin),
      });
      setSettingsMessageTone('success');
      setSettingsMessage('PIN de presencia actualizado');
    } catch (err) {
      setSettingsMessageTone('error');
      setSettingsMessage(toDisplayErrorMessage(err, 'Error al guardar PIN'));
    } finally {
      setSettingsSaving(false);
    }
  };

  const refreshExchangeRate = async () => {
    setSettingsSaving(true);
    setSettingsMessage('');
    try {
      const res = await apiFetch('/api/settings/exchange-rate/refresh', { method: 'POST' });
      const data = await parseJsonResponse<
        ExchangeRateAdminView & { result?: { message?: string } }
      >(res);
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Error al actualizar');
      setExchangeRateView(data);
      setExchangeRateForm({
        override_rate: data.override.rate != null ? String(data.override.rate) : '',
        override_note: data.override.note ?? '',
      });
      setSettingsMessageTone('success');
      setSettingsMessage(data.result?.message ?? 'Tasa BCV actualizada');
    } catch (err) {
      setSettingsMessageTone('error');
      setSettingsMessage(toDisplayErrorMessage(err, 'Error al actualizar tasa BCV'));
    } finally {
      setSettingsSaving(false);
    }
  };

  const saveExchangeRateOverride = async () => {
    setSettingsSaving(true);
    setSettingsMessage('');
    try {
      const rate = Number.parseFloat(exchangeRateForm.override_rate);
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error('Ingresa una tasa manual válida');
      }
      const res = await apiFetch('/api/settings/exchange-rate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          override_rate: rate,
          override_note: exchangeRateForm.override_note,
        }),
      });
      const data = await parseJsonResponse<ExchangeRateAdminView>(res);
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Error al guardar');
      setExchangeRateView(data);
      setExchangeRateForm({
        override_rate: data.override.rate != null ? String(data.override.rate) : '',
        override_note: data.override.note ?? '',
      });
      setSettingsMessageTone('success');
      setSettingsMessage('Tasa manual guardada');
    } catch (err) {
      setSettingsMessageTone('error');
      setSettingsMessage(toDisplayErrorMessage(err, 'Error al guardar tasa'));
    } finally {
      setSettingsSaving(false);
    }
  };

  const clearExchangeRateOverride = async () => {
    setSettingsSaving(true);
    setSettingsMessage('');
    try {
      const res = await apiFetch('/api/settings/exchange-rate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear_override: true }),
      });
      const data = await parseJsonResponse<ExchangeRateAdminView>(res);
      if (!res.ok)
        throw new Error((data as { error?: string }).error || 'Error al quitar override');
      setExchangeRateView(data);
      setExchangeRateForm({ override_rate: '', override_note: '' });
      setSettingsMessageTone('success');
      setSettingsMessage('Override manual eliminado');
    } catch (err) {
      setSettingsMessageTone('error');
      setSettingsMessage(toDisplayErrorMessage(err, 'Error al quitar override'));
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
          data.requestId
            ? `${data.error ?? 'No se pudo exportar'} (req: ${data.requestId})`
            : (data.error ?? 'No se pudo exportar')
        );
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = /filename="([^"]+)"/.exec(disposition);
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

  const opsAlerts = opsMetrics
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

  return (
    <div className="page-stack-tight">
      <PageHeader
        compact
        title={
          <>
            Configuración <span className="text-brand">del sistema</span>
          </>
        }
        subtitle="Avisos de chat, tasa BCV y salud operativa."
        action={<BackToDashboardLink />}
      />

      {emailConfigured === false && (
        <Card padding="sm" rounded="xl" className="panel-wide border-amber-500/30 bg-amber-500/10">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
            SMTP no configurado
          </p>
          <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300/80">
            Configure las variables SMTP del servidor para enviar bienvenidas, resets y avisos. Sin
            correo, recepción entregará el enlace de creación de contraseña en mostrador.
          </p>
        </Card>
      )}

      <Card padding="sm" rounded="xl" className="panel-wide">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
            <Settings2 className="text-brand h-4 w-4 shrink-0" />
            <span className="truncate">Notificaciones push</span>
          </h2>
        </div>
        <p className="mb-3 text-[11px] leading-snug text-zinc-500 sm:text-xs dark:text-zinc-400">
          Recibe notificaciones en tu dispositivo cuando haya novedades (pagos, mensajes,
          check-ins).
        </p>
        <PushNotificationsToggle />
      </Card>

      {settingsLoadError && (
        <Card padding="sm" rounded="xl" className="panel-wide border-red-500/30 bg-red-500/5">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            No se pudieron cargar los avisos de membresía. Revisa la conexión e intenta de nuevo.
          </p>
        </Card>
      )}

      {settingsLoading && !expirySettings && !settingsLoadError && (
        <Card padding="sm" rounded="xl" className="panel-wide">
          <div className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      )}

      {expirySettings && (
        <Card padding="sm" rounded="xl" className="panel-wide">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
              <Settings2 className="text-brand h-4 w-4 shrink-0" />
              <span className="truncate">Avisos de membresía</span>
            </h2>
            <div className="flex shrink-0 gap-1.5">
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

          <p className="mb-3 text-[11px] leading-snug text-zinc-500 sm:text-xs dark:text-zinc-400">
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
              className={`mt-3 text-[11px] leading-snug font-bold ${
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
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
            <Fingerprint className="text-brand h-4 w-4 shrink-0" />
            <span className="truncate">PIN de presencia (self check-in)</span>
          </h2>
          <Button
            type="button"
            size="sm"
            className="h-9 w-9 px-0"
            onClick={() => void saveCheckInPin()}
            disabled={settingsSaving}
            aria-label="Guardar PIN"
            title="Guardar PIN"
          >
            <Save className="h-4 w-4" />
          </Button>
        </div>
        <p className="mb-3 text-[11px] leading-snug text-zinc-500 sm:text-xs dark:text-zinc-400">
          Si está activo, el miembro debe ingresar el PIN del día (visible en recepción) para marcar
          entrada desde la app.
        </p>
        <label className="mb-3 flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={checkInPinForm.require_self_check_in_pin}
            onChange={(e) =>
              setCheckInPinForm((f) => ({
                ...f,
                require_self_check_in_pin: e.target.checked,
              }))
            }
          />
          Exigir PIN en self check-in
        </label>
        <div className="max-w-[10rem]">
          <Label htmlFor="check_in_pin" className="text-[11px]">
            PIN del día
          </Label>
          <Input
            id="check_in_pin"
            value={checkInPinForm.check_in_pin}
            onChange={(e) =>
              setCheckInPinForm((f) => ({ ...f, check_in_pin: e.target.value.slice(0, 12) }))
            }
            placeholder="Ej. 4821"
          />
        </div>
      </Card>

      {exchangeRateView && (
        <Card padding="sm" rounded="xl" className="panel-wide">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
              <DollarSign className="text-brand h-4 w-4 shrink-0" />
              <span className="truncate">Tasa de cambio USD (BCV)</span>
            </h2>
            <div className="flex shrink-0 gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 px-0"
                onClick={refreshExchangeRate}
                disabled={settingsSaving}
                aria-label="Actualizar desde BCV"
                title="Actualizar desde BCV"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 w-9 px-0"
                onClick={saveExchangeRateOverride}
                disabled={settingsSaving}
                aria-label="Guardar override"
                title="Guardar override manual"
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="mb-3 text-[11px] leading-snug text-zinc-500 sm:text-xs dark:text-zinc-400">
            Tasa oficial del Banco Central de Venezuela para pagos en bolívares (pago móvil y
            transferencia).
          </p>

          {exchangeRateView.active ? (
            <div className="mb-4 rounded-lg border border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
              <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Tasa activa
              </p>
              <p className="mt-1 text-lg font-bold text-zinc-900 tabular-nums dark:text-white">
                {exchangeRateView.active.rate.toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}{' '}
                Bs/USD
              </p>
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                Fuente: {exchangeRateView.active.source === 'manual' ? 'Manual' : 'BCV'} · Fecha
                valor: {exchangeRateView.active.effective_date}
              </p>
            </div>
          ) : (
            <p className="mb-4 text-sm font-medium text-amber-600 dark:text-amber-400">
              Sin tasa disponible. Usa &quot;Actualizar desde BCV&quot; o ingresa un override
              manual.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="exchange_override_rate" className="text-[11px]">
                Override manual (Bs/USD)
              </Label>
              <Input
                id="exchange_override_rate"
                type="number"
                min={1}
                step="0.01"
                placeholder="Ej. 685.94"
                value={exchangeRateForm.override_rate}
                onChange={(e) =>
                  setExchangeRateForm({ ...exchangeRateForm, override_rate: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="exchange_override_note" className="text-[11px]">
                Nota (opcional)
              </Label>
              <Input
                id="exchange_override_note"
                value={exchangeRateForm.override_note}
                onChange={(e) =>
                  setExchangeRateForm({ ...exchangeRateForm, override_note: e.target.value })
                }
                placeholder="Motivo del override"
              />
            </div>
          </div>

          {exchangeRateView.override.rate != null && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={clearExchangeRateOverride}
              disabled={settingsSaving}
            >
              Quitar override manual
            </Button>
          )}

          {exchangeRateView.history.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                Historial BCV reciente
              </p>
              <div className="space-y-1.5">
                {exchangeRateView.history.slice(0, 5).map((row) => (
                  <div
                    key={row.id}
                    className="rounded-lg border border-zinc-100 px-2.5 py-2 text-xs dark:border-zinc-800"
                  >
                    <span className="font-bold text-zinc-900 tabular-nums dark:text-white">
                      {row.rate.toLocaleString('es-VE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}{' '}
                      Bs/USD
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {' '}
                      · {row.effective_date}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <Card padding="sm" rounded="xl" className="panel-wide">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
            <Activity className="text-brand h-4 w-4 shrink-0" />
            Salud operativa
          </h2>
          {opsMetrics && (
            <div className="flex shrink-0 items-center gap-1.5">
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
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Cargando métricas…</p>
        ) : !opsMetrics && opsMetricsError ? (
          <p className="text-xs font-bold text-red-600 dark:text-red-400">{opsMetricsError}</p>
        ) : opsMetrics ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <div className="rounded-lg border border-zinc-100 px-2.5 py-2 dark:border-zinc-800">
                <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  DB ms
                </p>
                <p className="mt-0.5 text-base font-bold text-zinc-900 tabular-nums sm:text-lg dark:text-white">
                  {opsMetrics.db.latency_ms ?? '—'}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-100 px-2.5 py-2 dark:border-zinc-800">
                <p className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  Avg req ms
                </p>
                <p className="mt-0.5 text-base font-bold text-zinc-900 tabular-nums sm:text-lg dark:text-white">
                  {opsMetrics.request_metrics.avgResponseMs}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-100 px-2.5 py-2 dark:border-zinc-800">
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
              <div className="rounded-lg border border-zinc-100 px-2.5 py-2 dark:border-zinc-800">
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
              <div className="mt-4">
                <p className="mb-1.5 text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                  Top rutas lentas
                </p>
                <div className="space-y-1.5">
                  {opsMetrics.request_metrics.topSlowRoutes.map((route) => (
                    <div
                      key={`${route.method}-${route.path}`}
                      className="rounded-lg border border-zinc-100 px-2.5 py-2 dark:border-zinc-800"
                    >
                      <p className="truncate text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        {route.method} {route.path}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-700 tabular-nums dark:text-zinc-200">
                        avg {route.avgDurationMs}ms · max {route.maxDurationMs}ms · {route.count}{' '}
                        req
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
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
                      <p className="text-[11px] font-bold text-red-600 dark:text-red-400">
                        {alert}
                      </p>
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
