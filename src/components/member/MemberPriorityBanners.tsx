import { Link, useNavigate } from 'react-router';
import { format } from 'date-fns';
import { parseDateOnly } from '../../lib/dates';
import { dateLocale as es } from '../../lib/dateLocale';
import {
  expiryBannerClasses,
  formatExpiryCountdown,
  getExpirySeverity,
  shouldShowExpiryAlert,
} from '../../lib/expiryUtils';
import { cn } from '../../lib/utils';
import { PushOnboardingCard } from '../../components/PushOnboardingCard';
import { Button, Card } from '../../components/ui';

const BANNER =
  'flex flex-col justify-between gap-4 rounded-xl border px-ds-4 py-ds-4 sm:flex-row sm:items-center';

type SubscriptionLike = {
  days_remaining: number;
  membership_name: string;
  end_date?: string | null;
} | null;

/**
 * One priority banner on member home.
 * Order: pending payments → activate membership → expiry → push onboarding.
 */
export function MemberPriorityBanners({
  pending,
  subscription,
  alertDays,
}: {
  pending: number;
  subscription: SubscriptionLike;
  alertDays: number;
}) {
  const navigate = useNavigate();
  const sub = subscription;
  const showExpiry =
    pending === 0 && Boolean(sub) && shouldShowExpiryAlert(sub!.days_remaining, alertDays);
  const showActivate = !sub && pending === 0;
  const hasMembershipPriority = pending > 0 || showActivate || showExpiry;

  if (pending > 0) {
    return (
      <div className={cn(BANNER, 'border-warning/20 bg-warning/10')}>
        <div>
          <p className="text-text text-sm font-semibold">
            Tienes {pending} pago(s) pendiente(s) de revisión.
          </p>
          <p className="text-text-secondary text-small mt-1.5 leading-relaxed">
            Paso 3 de 3: espera la aprobación del staff para activar o renovar tu membresía.
            {sub && shouldShowExpiryAlert(sub.days_remaining, alertDays)
              ? ` · ${formatExpiryCountdown(sub.days_remaining)}`
              : ''}
          </p>
        </div>
        <Link
          to="/payments?status=pending"
          className="text-warning text-small font-semibold underline hover:no-underline"
        >
          Ver pagos
        </Link>
      </div>
    );
  }

  if (showActivate) {
    return (
      <Card padding="md" rounded="xl" className="bg-brand/5 dark:bg-brand/[0.08]">
        <h3 className="text-text text-sm font-bold">Activa tu membresía</h3>
        <ol className="text-text-secondary mt-4 space-y-3 text-xs leading-relaxed">
          <li>
            <span className="text-brand font-semibold">1.</span> Elige un plan al reportar el pago
          </li>
          <li>
            <span className="text-brand font-semibold">2.</span> Sube el comprobante con referencia
          </li>
          <li>
            <span className="text-brand font-semibold">3.</span> Espera la aprobación del gym
          </li>
        </ol>
        <Button size="sm" className="mt-5" onClick={() => navigate('/payments?register=1')}>
          Empezar renovación
        </Button>
      </Card>
    );
  }

  if (showExpiry && sub) {
    const severity = getExpirySeverity(sub.days_remaining, alertDays);
    const classes = expiryBannerClasses(severity);
    const suffix =
      sub.days_remaining === 0
        ? ' Renueva para seguir entrenando.'
        : sub.days_remaining === 1
          ? ' Renueva pronto.'
          : '';
    return (
      <div className={cn(BANNER, classes.container)}>
        <div>
          <p className={cn('text-sm font-bold', classes.text)}>
            {formatExpiryCountdown(sub.days_remaining) + suffix}
          </p>
          <p className={cn('text-small mt-1.5 leading-relaxed opacity-80', classes.text)}>
            Plan {sub.membership_name}
            {sub.end_date
              ? ` · vence ${format(parseDateOnly(sub.end_date), 'dd MMM yyyy', { locale: es })}`
              : ''}
          </p>
        </div>
        <Button size="sm" onClick={() => navigate('/payments?register=1')}>
          Reportar pago
        </Button>
      </div>
    );
  }

  if (!hasMembershipPriority) {
    return <PushOnboardingCard />;
  }

  return null;
}
