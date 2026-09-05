import { Card, PageHeader, BackToDashboardLink } from '../components/ui';
import { PaymentDestinationsSettingsCard } from '../components/settings/PaymentDestinationsSettingsCard';
import { SettingsOpsHealthCard } from './settings/SettingsOpsHealthCard';
import { SettingsNav } from './settings/SettingsNav';
import { SettingsPushCard } from './settings/SettingsPushCard';
import { SettingsExpiryCard } from './settings/SettingsExpiryCard';
import { SettingsChatRetentionCard } from './settings/SettingsChatRetentionCard';
import { SettingsCheckInPinCard } from './settings/SettingsCheckInPinCard';
import { SettingsExchangeRateCard } from './settings/SettingsExchangeRateCard';
import { useSettingsPage } from './settings/useSettingsPage';
import { typography } from '../lib/typography';
import { cn } from '../lib/utils';

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 space-y-3">
      <h2 className={cn(typography.sectionTitle, 'text-text px-0.5')}>{title}</h2>
      {children}
    </section>
  );
}

export default function Settings() {
  const page = useSettingsPage();

  return (
    <div className="page-stack-tight mx-auto w-full max-w-6xl min-w-0">
      <PageHeader
        compact
        showTitleOnMobile
        title={
          <>
            Configuración <span className="text-brand">del sistema</span>
          </>
        }
        subtitle="Avisos de chat, tasa BCV y salud operativa."
        action={<BackToDashboardLink />}
      />

      {page.emailConfigured === false && (
        <Card padding="sm" rounded="xl" className="border-warning/30 bg-warning/10 min-w-0">
          <p className="text-warning text-sm font-bold">SMTP no configurado</p>
          <p className="text-warning/80 mt-1 text-xs leading-snug">
            Configure las variables SMTP del servidor para enviar bienvenidas, resets y avisos. Sin
            correo, recepción entregará el enlace de creación de contraseña en mostrador.
          </p>
        </Card>
      )}

      <div className="xl:grid xl:grid-cols-[12rem_minmax(0,1fr)] xl:items-start xl:gap-5">
        <SettingsNav />

        <div className="min-w-0 space-y-4 lg:space-y-5">
          <SettingsGroup title="Operación">
            <div className="grid min-w-0 gap-3 lg:grid-cols-2 lg:items-stretch lg:gap-4">
              <SettingsPushCard />
              <SettingsCheckInPinCard
                checkInPinForm={page.checkInPinForm}
                settingsSaving={page.settingsSaving}
                onCheckInPinFormChange={page.setCheckInPinForm}
                onSave={() => void page.saveCheckInPin()}
              />
              {page.chatRetention && (
                <SettingsChatRetentionCard
                  chatRetention={page.chatRetention}
                  settingsSaving={page.settingsSaving}
                  settingsMessage={page.settingsMessage}
                  settingsMessageTone={page.settingsMessageTone}
                  onChatRetentionChange={page.setChatRetention}
                  onSave={() => void page.saveChatRetention()}
                />
              )}
            </div>
            <SettingsOpsHealthCard
              opsMetrics={page.opsMetrics}
              opsMetricsLoading={page.opsMetricsLoading}
              opsMetricsError={page.opsMetricsError}
              opsAlerts={page.opsAlerts}
              onExportJson={() => void page.downloadMetricsExport('json')}
              onExportCsv={() => void page.downloadMetricsExport('csv')}
            />
          </SettingsGroup>

          <SettingsGroup title="Pagos">
            <PaymentDestinationsSettingsCard
              onMessage={(tone, message) => {
                page.setSettingsMessageTone(tone);
                page.setSettingsMessage(message);
              }}
            />
            {page.exchangeRateView && (
              <SettingsExchangeRateCard
                exchangeRateView={page.exchangeRateView}
                exchangeRateForm={page.exchangeRateForm}
                settingsSaving={page.settingsSaving}
                onExchangeRateFormChange={page.setExchangeRateForm}
                onRefresh={() => void page.refreshExchangeRate()}
                onSaveOverride={() => void page.saveExchangeRateOverride()}
                onClearOverride={() => void page.clearExchangeRateOverride()}
              />
            )}
          </SettingsGroup>

          <SettingsGroup title="Alertas">
            <SettingsExpiryCard
              expirySettings={page.expirySettings}
              settingsLoading={page.settingsLoading}
              settingsLoadError={page.settingsLoadError}
              settingsSaving={page.settingsSaving}
              settingsMessage={page.settingsMessage}
              settingsMessageTone={page.settingsMessageTone}
              onExpirySettingsChange={page.setExpirySettings}
              onSave={() => void page.saveExpirySettings()}
              onRunJob={() => void page.runExpiryJobNow()}
            />
          </SettingsGroup>
        </div>
      </div>
    </div>
  );
}
