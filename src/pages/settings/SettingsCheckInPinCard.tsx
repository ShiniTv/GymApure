import { Fingerprint, Save } from 'lucide-react';
import { Button, Card, Input, Label } from '../../components/ui';

interface CheckInPinForm {
  check_in_pin: string;
  require_self_check_in_pin: boolean;
}

interface SettingsCheckInPinCardProps {
  checkInPinForm: CheckInPinForm;
  settingsSaving: boolean;
  onCheckInPinFormChange: (updater: (prev: CheckInPinForm) => CheckInPinForm) => void;
  onSave: () => void;
}

export function SettingsCheckInPinCard({
  checkInPinForm,
  settingsSaving,
  onCheckInPinFormChange,
  onSave,
}: SettingsCheckInPinCardProps) {
  return (
    <Card
      id="pin-presencia"
      padding="sm"
      rounded="xl"
      className="flex min-w-0 scroll-mt-20 flex-col overflow-hidden md:p-4"
    >
      <div className="mb-2.5 flex min-w-0 items-center gap-2">
        <h2 className="text-text flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold">
          <Fingerprint className="text-brand h-4 w-4 shrink-0" />
          <span className="truncate">PIN de presencia</span>
        </h2>
        <Button
          type="button"
          size="sm"
          className="h-9 min-h-9 w-9 min-w-9 shrink-0 p-0"
          onClick={onSave}
          disabled={settingsSaving}
          aria-label="Guardar PIN"
          title="Guardar PIN"
        >
          <Save className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-text-muted text-small mb-3 leading-snug sm:text-xs">
        Si está activo, el miembro debe ingresar el PIN del día (visible en recepción) para marcar
        entrada desde la app.
      </p>
      <label className="text-text-secondary mb-3 flex min-w-0 items-start gap-2 text-xs font-medium">
        <input
          type="checkbox"
          className="mt-0.5 shrink-0"
          checked={checkInPinForm.require_self_check_in_pin}
          onChange={(e) =>
            onCheckInPinFormChange((f) => ({
              ...f,
              require_self_check_in_pin: e.target.checked,
            }))
          }
        />
        <span className="min-w-0 leading-snug">Exigir PIN en ingreso desde la app</span>
      </label>
      <div className="mt-auto max-w-[8rem]">
        <Label htmlFor="check_in_pin" className="text-small">
          PIN del día
        </Label>
        <Input
          id="check_in_pin"
          value={checkInPinForm.check_in_pin}
          onChange={(e) =>
            onCheckInPinFormChange((f) => ({ ...f, check_in_pin: e.target.value.slice(0, 12) }))
          }
          placeholder="Ej. 4821"
        />
      </div>
    </Card>
  );
}
