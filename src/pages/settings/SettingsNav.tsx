import { Card } from '../../components/ui';

export const SETTINGS_NAV = [
  { id: 'notificaciones-push', label: 'Notificaciones push' },
  { id: 'avisos-membresia', label: 'Avisos de membresía' },
  { id: 'retencion-chat', label: 'Retención del chat' },
  { id: 'pin-presencia', label: 'PIN de presencia' },
  { id: 'datos-cobro', label: 'Datos de cobro' },
  { id: 'tasa-usd', label: 'Tasa USD (BCV)' },
  { id: 'salud-operativa', label: 'Salud operativa' },
] as const;

export function SettingsNav() {
  return (
    <nav
      aria-label="Secciones de configuración"
      className="sticky top-3 mb-3 hidden self-start xl:mb-0 xl:block"
    >
      <Card padding="sm" rounded="xl" className="space-y-0.5">
        <p className="text-text-muted text-small mb-2 px-2 font-medium tracking-wide uppercase">
          Secciones
        </p>
        {SETTINGS_NAV.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="text-text-secondary hover:bg-surface-overlay block rounded-[var(--radius-button)] px-2.5 py-2 text-sm font-medium transition-colors"
          >
            {item.label}
          </a>
        ))}
      </Card>
    </nav>
  );
}
