import { MessageSquare, Save } from 'lucide-react';
import { Button, Card, Label, Select } from '../../components/ui';
import { CHAT_RETENTION_OPTIONS, type ChatRetentionForm } from './useSettingsPage';

interface SettingsChatRetentionCardProps {
  chatRetention: ChatRetentionForm;
  settingsSaving: boolean;
  settingsMessage: string;
  settingsMessageTone: 'success' | 'info' | 'error';
  onChatRetentionChange: (next: ChatRetentionForm) => void;
  onSave: () => void;
}

export function SettingsChatRetentionCard({
  chatRetention,
  settingsSaving,
  settingsMessage,
  settingsMessageTone,
  onChatRetentionChange,
  onSave,
}: SettingsChatRetentionCardProps) {
  return (
    <Card
      id="retencion-chat"
      padding="sm"
      rounded="xl"
      className="min-w-0 scroll-mt-20 overflow-hidden md:p-4"
    >
      <div className="mb-2.5 flex min-w-0 items-center gap-2">
        <h2 className="flex min-w-0 flex-1 items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
          <MessageSquare className="text-brand h-4 w-4 shrink-0" />
          <span className="truncate">Retención del chat</span>
        </h2>
        <Button
          type="button"
          size="sm"
          className="h-9 min-h-9 w-9 min-w-9 shrink-0 p-0"
          onClick={onSave}
          disabled={settingsSaving}
          aria-label="Guardar retención del chat"
          title="Guardar"
        >
          <Save className="h-4 w-4" />
        </Button>
      </div>

      <p className="mb-3 text-[11px] leading-snug text-zinc-500 sm:text-xs dark:text-zinc-400">
        Borra mensajes antiguos (y adjuntos) en el mantenimiento diario. Las conversaciones se
        conservan vacías.
      </p>

      <div className="max-w-xs">
        <Label htmlFor="chat_message_retention_days" className="text-[11px]">
          Conservar mensajes durante
        </Label>
        <Select
          id="chat_message_retention_days"
          value={String(chatRetention.chat_message_retention_days)}
          onChange={(e) =>
            onChatRetentionChange({
              chat_message_retention_days: parseInt(e.target.value, 10) || 0,
            })
          }
        >
          {CHAT_RETENTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
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
  );
}
