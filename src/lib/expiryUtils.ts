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
  return severity === 'critical' ? 'bg-red-500' : 'bg-orange-500';
}

export function expiryBannerClasses(severity: ExpirySeverity) {
  switch (severity) {
    case 'critical':
      return {
        container: 'border-red-500/30 bg-red-500/10',
        text: 'text-red-700 dark:text-red-400',
        link: 'text-red-800 dark:text-red-300',
        badge: 'bg-red-500/10 text-red-600 dark:text-red-500',
        itemBorder: 'border-red-500/20 bg-red-500/5',
      };
    case 'warning':
      return {
        container: 'border-orange-500/30 bg-orange-500/10',
        text: 'text-orange-700 dark:text-orange-400',
        link: 'text-orange-800 dark:text-orange-300',
        badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-500',
        itemBorder: 'border-orange-500/20 bg-orange-500/5',
      };
    default:
      return {
        container: 'border-zinc-200 dark:border-zinc-800',
        text: 'text-zinc-600 dark:text-zinc-300',
        link: 'text-orange-600 dark:text-orange-500',
        badge: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500',
        itemBorder: 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30',
      };
  }
}

export function formatExpiryLabel(days: number): string {
  if (days === 0) return 'Hoy';
  if (days === 1) return '1d';
  return `${days}d`;
}
