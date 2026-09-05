import { Settings2, Save, Zap } from 'lucide-react';
import { Button, Card, Input, Label, Skeleton } from '../../components/ui';
import type { ExpirySettingsForm } from './useSettingsPage';

interface SettingsExpiryCardProps {
  expirySettings: ExpirySettingsForm | null;
  settingsLoading: boolean;
  settingsLoadError: boolean;
  settingsSaving: boolean;
  settingsMessage: string;
  settingsMessageTone: 'success' | 'info' | 'error';
  onExpirySettingsChange: (next: ExpirySettingsForm) => void;
  onSave: () => void;
  onRunJob: () => void;
}

export function SettingsExpiryCard({
  expirySettings,
  settingsLoading,
  settingsLoadError,
  settingsSaving,
  settingsMessage,
  settingsMessageTone,
  onExpirySettingsChange,
  onSave,
  onRunJob,
}: SettingsExpiryCardProps) {
  return (
    <>
      {settingsLoadError && (
        <Card
          padding="sm"
          rounded="xl"
          className="border-danger/30 min-w-0 overflow-hidden bg-red-500/5 md:p-4"
        >
          <p className="text-danger dark:text-danger text-sm font-semibold">
            No se pudieron cargar los avisos de membresía. Revisa la conexión e intenta de nuevo.
          </p>
        </Card>
      )}

      {settingsLoading && !expirySettings && !settingsLoadError && (
        <Card padding="sm" rounded="xl" className="min-w-0 overflow-hidden md:p-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      )}

      {expirySettings && (
        <Card
          id="avisos-membresia"
          padding="sm"
          rounded="xl"
          className="min-w-0 scroll-mt-20 overflow-hidden md:p-4"
        >
          <div className="mb-2.5 flex min-w-0 items-center gap-2">
            <h2 className="text-text flex min-w-0 flex-1 items-center gap-2 text-sm font-bold">
              <Settings2 className="text-brand h-4 w-4 shrink-0" />
              <span className="truncate">Avisos de membresía</span>
            </h2>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 min-h-9 w-9 min-w-9 shrink-0 p-0"
                onClick={onRunJob}
                disabled={settingsSaving}
                aria-label="Ejecutar avisos ahora"
                title="Ejecutar avisos ahora"
              >
                <Zap className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 min-h-9 w-9 min-w-9 shrink-0 p-0"
                onClick={onSave}
                disabled={settingsSaving}
                aria-label="Guardar"
                title="Guardar"
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="text-text-muted text-small mb-3 leading-snug sm:text-xs">
            Vencimiento, pagos y rutinas se envían al chat de cada miembro.
          </p>

          <div className="max-w-[6rem]">
            <Label htmlFor="expiry_alert_days" className="text-small">
              Días de anticipación
            </Label>
            <Input
              id="expiry_alert_days"
              type="number"
              min={1}
              max={90}
              value={expirySettings.expiry_alert_days}
              onChange={(e) =>
                onExpirySettingsChange({
                  ...expirySettings,
                  expiry_alert_days: Math.min(90, Math.max(1, parseInt(e.target.value, 10) || 1)),
                })
              }
            />
          </div>

          {settingsMessage && (
            <p
              className={`text-small mt-3 leading-snug font-bold ${
                settingsMessageTone === 'success'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : settingsMessageTone === 'info'
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-danger dark:text-danger'
              }`}
            >
              {settingsMessage}
            </p>
          )}
        </Card>
      )}
    </>
  );
}
