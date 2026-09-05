import { DollarSign, RefreshCw, Save } from 'lucide-react';
import { Button, Card, Input, Label } from '../../components/ui';
import type { ExchangeRateAdminView, ExchangeRateForm } from './useSettingsPage';

interface SettingsExchangeRateCardProps {
  exchangeRateView: ExchangeRateAdminView;
  exchangeRateForm: ExchangeRateForm;
  settingsSaving: boolean;
  onExchangeRateFormChange: (next: ExchangeRateForm) => void;
  onRefresh: () => void;
  onSaveOverride: () => void;
  onClearOverride: () => void;
}

export function SettingsExchangeRateCard({
  exchangeRateView,
  exchangeRateForm,
  settingsSaving,
  onExchangeRateFormChange,
  onRefresh,
  onSaveOverride,
  onClearOverride,
}: SettingsExchangeRateCardProps) {
  return (
    <Card
      id="tasa-usd"
      padding="sm"
      rounded="xl"
      className="flex min-w-0 scroll-mt-20 flex-col overflow-hidden md:p-4"
    >
      <div className="mb-2.5 flex min-w-0 items-center gap-2">
        <h2 className="text-text flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold">
          <DollarSign className="text-brand h-4 w-4 shrink-0" />
          <span className="truncate">Tasa USD (BCV)</span>
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 min-h-9 w-9 min-w-9 shrink-0 p-0"
            onClick={onRefresh}
            disabled={settingsSaving}
            aria-label="Actualizar desde BCV"
            title="Actualizar desde BCV"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 min-h-9 w-9 min-w-9 shrink-0 p-0"
            onClick={onSaveOverride}
            disabled={settingsSaving}
            aria-label="Guardar override"
            title="Guardar override manual"
          >
            <Save className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-text-muted text-small mb-3 leading-snug sm:text-xs">
        Tasa oficial del Banco Central de Venezuela para pagos en bolívares (pago móvil y
        transferencia).
      </p>

      {exchangeRateView.active ? (
        <div className="border-border/70 bg-surface-raised/50 mb-4 min-w-0 rounded-[var(--radius-card)] border px-3 py-3">
          <p className="text-text-muted text-small font-medium tracking-wide uppercase">
            Tasa activa
          </p>
          <p className="text-text mt-1 text-lg font-semibold break-words tabular-nums">
            {exchangeRateView.active.rate.toLocaleString('es-VE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            })}{' '}
            Bs/USD
          </p>
          <p className="text-text-muted text-small mt-1 leading-snug">
            Fuente: {exchangeRateView.active.source === 'manual' ? 'Manual' : 'BCV'} · Fecha valor:{' '}
            {exchangeRateView.active.effective_date}
          </p>
        </div>
      ) : (
        <p className="mb-4 text-sm font-medium text-amber-600 dark:text-amber-400">
          Sin tasa disponible. Usa &quot;Actualizar desde BCV&quot; o ingresa un override manual.
        </p>
      )}

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <Label htmlFor="exchange_override_rate" className="text-small">
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
              onExchangeRateFormChange({ ...exchangeRateForm, override_rate: e.target.value })
            }
          />
        </div>
        <div className="min-w-0">
          <Label htmlFor="exchange_override_note" className="text-small">
            Nota (opcional)
          </Label>
          <Input
            id="exchange_override_note"
            value={exchangeRateForm.override_note}
            onChange={(e) =>
              onExchangeRateFormChange({ ...exchangeRateForm, override_note: e.target.value })
            }
            placeholder="Motivo del override"
          />
        </div>
      </div>

      {exchangeRateView.override.rate != null && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={onClearOverride}
          disabled={settingsSaving}
        >
          Quitar override manual
        </Button>
      )}

      {exchangeRateView.history.length > 0 && (
        <div className="mt-4 min-w-0">
          <p className="text-text-muted text-small mb-1.5 font-medium tracking-wide uppercase">
            Historial BCV reciente
          </p>
          <div className="space-y-1.5">
            {exchangeRateView.history.slice(0, 5).map((row) => (
              <div
                key={row.id}
                className="border-border/70 min-w-0 rounded-[var(--radius-card)] border px-2.5 py-2 text-xs"
              >
                <span className="text-text font-semibold tabular-nums">
                  {row.rate.toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}{' '}
                  Bs/USD
                </span>
                <span className="text-text-muted"> · {row.effective_date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
