import { useState, useEffect } from 'react';
import { apiFetch, parseJsonResponse, parseJsonSafe, toDisplayErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useAdminStats } from '../../context/AdminStatsContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import type { HealthMetricsResponse } from './SettingsOpsHealthCard';

export interface ExpirySettingsForm {
  expiry_alert_days: number;
}

export interface ChatRetentionForm {
  chat_message_retention_days: number;
}

export const CHAT_RETENTION_OPTIONS = [
  { value: 0, label: 'No borrar automáticamente' },
  { value: 30, label: '30 días' },
  { value: 60, label: '60 días' },
  { value: 90, label: '90 días' },
  { value: 180, label: '180 días' },
] as const;

export interface ExchangeRateAdminView {
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

export interface ExchangeRateForm {
  override_rate: string;
  override_note: string;
}

export function useSettingsPage() {
  const { user } = useAuth();
  usePageTitle('Configuración');
  const adminStats = useAdminStats();
  const [expirySettings, setExpirySettings] = useState<ExpirySettingsForm | null>(null);
  const [chatRetention, setChatRetention] = useState<ChatRetentionForm | null>(null);
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

    apiFetch('/api/settings/chat-retention')
      .then((res) => parseJsonResponse<ChatRetentionForm>(res))
      .then((data) => {
        setChatRetention(data);
      })
      .catch(() => {
        setChatRetention(null);
      });

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

  const saveChatRetention = async () => {
    if (!chatRetention) return;
    setSettingsSaving(true);
    setSettingsMessage('');
    try {
      const res = await apiFetch('/api/settings/chat-retention', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatRetention),
      });
      const data = await parseJsonResponse<ChatRetentionForm & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      setChatRetention(data);
      setSettingsMessageTone('success');
      setSettingsMessage(
        data.chat_message_retention_days === 0
          ? 'Retención del chat desactivada'
          : `El chat se limpiará automáticamente tras ${data.chat_message_retention_days} días`
      );
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

  return {
    expirySettings,
    setExpirySettings,
    chatRetention,
    setChatRetention,
    checkInPinForm,
    setCheckInPinForm,
    emailConfigured,
    exchangeRateView,
    exchangeRateForm,
    setExchangeRateForm,
    settingsLoading,
    settingsLoadError,
    settingsSaving,
    settingsMessage,
    settingsMessageTone,
    setSettingsMessage,
    setSettingsMessageTone,
    opsMetrics,
    opsMetricsError,
    opsMetricsLoading,
    opsAlerts,
    saveExpirySettings,
    saveChatRetention,
    saveCheckInPin,
    refreshExchangeRate,
    saveExchangeRateOverride,
    clearExchangeRateOverride,
    runExpiryJobNow,
    downloadMetricsExport,
  };
}
