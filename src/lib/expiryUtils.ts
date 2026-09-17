export type ExpirySeverity = 'critical' | 'warning' | 'ok';

/** Umbral para alertas en nav/perfil del miembro (más visible que el panel admin). */
export const MEMBER_UI_ALERT_DAYS = 5;

export function getExpirySeverity(days: number, alertDays = 7): ExpirySeverity {
  if (days <= 3) return 'critical';
  if (days <= alertDays) return 'warning';
  return 'ok';
}

export function shouldShowExpiryAlert(days: number, alertDays = 7): boolean {
  return days <= alertDays;
}

export function getExpiryBadgeInfo(
  days: number | null | undefined,
  alertDays = 7
): { label: string; className: string } | null {
  if (days == null || days > alertDays) return null;
  const severity = getExpirySeverity(days, alertDays);
  const classes = expiryBannerClasses(severity);
  const label = days === 0 ? 'Vence hoy' : formatExpiryLabel(days);
  return { label, className: classes.badge };
}

export function formatExpiryCountdown(days: number, subject = 'membresía'): string {
  if (days === 0) return `Tu ${subject} vence hoy.`;
  if (days === 1) return `Tu ${subject} vence mañana.`;
  return `Tu ${subject} vence en ${days} días.`;
}

export function expiryNavDotClass(days: number, alertDays = MEMBER_UI_ALERT_DAYS): string {
  const severity = getExpirySeverity(days, alertDays);
  return severity === 'critical' ? 'bg-danger' : 'bg-warning';
}

export function expiryBannerClasses(severity: ExpirySeverity) {
  switch (severity) {
    case 'critical':
      return {
        container: 'bg-danger/10 border border-danger/20',
        text: 'text-danger',
        link: 'text-danger font-semibold underline',
        badge: 'bg-danger/15 text-danger',
        itemBorder: 'bg-danger/5',
      };
    case 'warning':
      return {
        container: 'bg-warning/10 border border-warning/20',
        text: 'text-warning',
        link: 'text-warning font-semibold underline',
        badge: 'bg-warning/15 text-warning',
        itemBorder: 'bg-warning/5',
      };
    default:
      return {
        container: 'bg-surface border border-border',
        text: 'text-text-secondary',
        link: 'text-brand font-semibold underline',
        badge: 'bg-surface-overlay text-text-muted',
        itemBorder: 'bg-surface-raised',
      };
  }
}

export function formatExpiryLabel(days: number): string {
  if (days === 0) return 'Hoy';
  if (days === 1) return '1d';
  return `${days}d`;
}

export function formatRemainingDaysShort(days: number): string {
  if (days === 0) return 'Vence hoy';
  if (days === 1) return '1 día restante';
  return `${days} días restantes`;
}

export function computeSubscriptionRemainingPercent(
  daysRemaining: number,
  startDate: string,
  endDate: string
): number {
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();
  const totalDays = Math.max(1, Math.round((endMs - startMs) / 86_400_000));
  return Math.min(100, Math.round((Math.max(0, daysRemaining) / totalDays) * 100));
}

export function getSubscriptionBarStyle(remainingPercent: number): {
  widthPercent: number;
  backgroundColor: string;
} {
  const widthPercent = Math.max(0, Math.min(100, remainingPercent));
  const ratio = widthPercent / 100;
  const hue = ratio * 142;
  const saturation = 70 + ratio * 2;
  const lightness = 42 + ratio * 8;
  return {
    widthPercent,
    backgroundColor: `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`,
  };
}

export function subscriptionPlanNameClass(
  daysRemaining: number,
  alertDays = MEMBER_UI_ALERT_DAYS
): string {
  const severity = getExpirySeverity(daysRemaining, alertDays);
  if (severity === 'critical') return 'text-danger';
  if (severity === 'warning') return 'text-warning';
  return 'text-success';
}
