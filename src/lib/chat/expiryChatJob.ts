import { query } from '../../db/index.ts';
import { getExpirySettings } from '../gymSettings.ts';
import { markExpiredSubscriptions, type ExpiringSubscription } from '../expiringSubscriptions.ts';
import { postSystemMessage } from './systemMessages.ts';
import { BRAND } from '../../config/brand.ts';
import { notifyMembershipExpiry } from './eventMessages.ts';
import { mapWithConcurrency } from '../runInBatches.ts';

export interface ExpiryJobResult {
  markedExpired: number;
  messagesSent: number;
  skipped: number;
}

interface NotifyTarget extends ExpiringSubscription {
  subscription_id: number;
}

const NOTIFY_CONCURRENCY = 5;

function expiryMessage(fullName: string, membershipName: string, daysRemaining: number): string {
  if (daysRemaining <= 0) {
    return `Hola ${fullName}, tu membresía "${membershipName}" en ${BRAND.name} vence hoy. Renueva para seguir entrenando.`;
  }
  if (daysRemaining === 1) {
    return `Hola ${fullName}, tu membresía "${membershipName}" en ${BRAND.name} vence mañana.`;
  }
  return `Hola ${fullName}, tu membresía "${membershipName}" en ${BRAND.name} vence en ${daysRemaining} días.`;
}

async function getNotifyTargets(days: number): Promise<NotifyTarget[]> {
  const { rows } = await query<NotifyTarget>(
    `SELECT DISTINCT ON (u.id)
      u.id AS user_id,
      u.full_name,
      u.cedula,
      s.id AS subscription_id,
      m.name AS membership_name,
      s.end_date::text AS end_date,
      GREATEST(0, s.end_date - CURRENT_DATE)::int AS days_remaining
     FROM users u
     JOIN subscriptions s ON s.user_id = u.id
     JOIN memberships m ON m.id = s.membership_id
     WHERE u.role = 'member'
       AND u.status = 'active'
       AND s.status = 'active'
       AND s.end_date >= CURRENT_DATE
       AND s.end_date <= CURRENT_DATE + $1::int
     ORDER BY u.id, s.end_date ASC`,
    [days]
  );
  return rows;
}

async function getRecentlyExpiredTargets(): Promise<NotifyTarget[]> {
  const { rows } = await query<NotifyTarget>(
    `SELECT DISTINCT ON (u.id)
      u.id AS user_id,
      u.full_name,
      u.cedula,
      s.id AS subscription_id,
      m.name AS membership_name,
      s.end_date::text AS end_date,
      0 AS days_remaining
     FROM users u
     JOIN subscriptions s ON s.user_id = u.id
     JOIN memberships m ON m.id = s.membership_id
     WHERE u.role = 'member'
       AND s.status = 'expired'
       AND s.end_date >= CURRENT_DATE - INTERVAL '1 day'
       AND s.end_date < CURRENT_DATE
     ORDER BY u.id, s.end_date DESC`
  );
  return rows;
}

async function notifyExpiringSoon(
  target: NotifyTarget,
  alertDays: number
): Promise<'sent' | 'skipped'> {
  const sent = await postSystemMessage({
    memberId: target.user_id,
    eventType: 'expiring_soon',
    body: expiryMessage(target.full_name, target.membership_name, target.days_remaining),
    subscriptionId: target.subscription_id,
    daysRemaining: target.days_remaining,
    metadata: {
      subscription_id: target.subscription_id,
      membership_name: target.membership_name,
      end_date: target.end_date,
      days_remaining: target.days_remaining,
    },
  });

  const notificationSent = await notifyMembershipExpiry(target.user_id, 'expiring_soon', {
    membershipName: target.membership_name,
    daysRemaining: target.days_remaining,
    subscriptionId: target.subscription_id,
    endDate: target.end_date,
    alertDays,
  });
  return sent || notificationSent ? 'sent' : 'skipped';
}

async function notifyExpired(target: NotifyTarget, alertDays: number): Promise<'sent' | 'skipped'> {
  const body = `Hola ${target.full_name}, tu membresía "${target.membership_name}" en ${BRAND.name} ha vencido. Renueva para recuperar el acceso.`;
  const sent = await postSystemMessage({
    memberId: target.user_id,
    eventType: 'expired',
    body,
    subscriptionId: target.subscription_id,
    daysRemaining: 0,
    metadata: {
      subscription_id: target.subscription_id,
      membership_name: target.membership_name,
      end_date: target.end_date,
    },
  });

  const notificationSent = await notifyMembershipExpiry(target.user_id, 'expired', {
    membershipName: target.membership_name,
    daysRemaining: 0,
    subscriptionId: target.subscription_id,
    endDate: target.end_date,
    alertDays,
  });
  return sent || notificationSent ? 'sent' : 'skipped';
}

export async function runExpiryJob(): Promise<ExpiryJobResult> {
  const result: ExpiryJobResult = {
    markedExpired: 0,
    messagesSent: 0,
    skipped: 0,
  };

  const settings = await getExpirySettings();
  result.markedExpired = await markExpiredSubscriptions();

  const targets = await getNotifyTargets(settings.expiry_alert_days);
  const expiredTargets = await getRecentlyExpiredTargets();

  const expiringResults = await mapWithConcurrency(
    targets,
    (target) => notifyExpiringSoon(target, settings.expiry_alert_days),
    NOTIFY_CONCURRENCY
  );
  const expiredResults = await mapWithConcurrency(
    expiredTargets,
    (target) => notifyExpired(target, settings.expiry_alert_days),
    NOTIFY_CONCURRENCY
  );

  for (const status of [...expiringResults, ...expiredResults]) {
    if (status === 'sent') result.messagesSent += 1;
    else result.skipped += 1;
  }

  if (result.messagesSent || result.markedExpired) {
    console.log('[expiry-job]', result);
  }

  return result;
}
