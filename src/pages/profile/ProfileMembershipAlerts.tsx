import { Link } from 'react-router';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { dateLocale as es } from '../../lib/dateLocale';
import {
  expiryBannerClasses,
  formatExpiryCountdown,
  getExpirySeverity,
  MEMBER_UI_ALERT_DAYS,
  shouldShowExpiryAlert,
} from '../../lib/expiryUtils';

interface SubscriptionLike {
  membership_name: string;
  days_remaining: number;
  end_date: string;
}

interface ProfileMembershipAlertsProps {
  role: string;
  subscription: SubscriptionLike | null;
}

export function ProfileMembershipAlerts({ role, subscription }: ProfileMembershipAlertsProps) {
  if (role !== 'member') return null;

  if (subscription && shouldShowExpiryAlert(subscription.days_remaining, MEMBER_UI_ALERT_DAYS)) {
    const severity = getExpirySeverity(subscription.days_remaining, MEMBER_UI_ALERT_DAYS);
    const classes = expiryBannerClasses(severity);
    return (
      <div
        className={`flex flex-col justify-between gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center ${classes.container}`}
      >
        <div className="flex min-w-0 items-start gap-2">
          <AlertTriangle
            className={`mt-0.5 h-4 w-4 shrink-0 ${severity === 'critical' ? 'text-danger' : 'text-warning'}`}
          />
          <div className="min-w-0">
            <p className={`text-xs leading-snug font-semibold sm:text-sm ${classes.text}`}>
              {formatExpiryCountdown(
                subscription.days_remaining,
                `plan ${subscription.membership_name}`
              )}
            </p>
            <p className="text-text-muted text-small mt-0.5">
              Vence {format(new Date(subscription.end_date), 'dd MMM yyyy', { locale: es })}
            </p>
          </div>
        </div>
        <Link
          to="/payments"
          className={`inline-flex shrink-0 items-center gap-2 text-xs font-semibold ${classes.link}`}
        >
          <CreditCard className="h-4 w-4" />
          Renovar
        </Link>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="flex flex-col justify-between gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2.5 sm:flex-row sm:items-center">
        <p className="text-xs leading-snug font-semibold text-yellow-700 sm:text-sm dark:text-yellow-400">
          No tienes una membresía activa. Reporta tu pago para reactivar el acceso.
        </p>
        <Link
          to="/payments"
          className="shrink-0 text-xs font-semibold text-yellow-800 hover:underline dark:text-yellow-300"
        >
          Reportar pago
        </Link>
      </div>
    );
  }

  return null;
}
