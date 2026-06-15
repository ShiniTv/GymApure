import { query } from '../../db/index.ts';
import { getExpirySettings } from '../gymSettings.ts';
import {
  getExpiringSubscriptions,
  markExpiredSubscriptions,
  type ExpiringSubscription,
} from '../expiringSubscriptions.ts';
import {
  sendEmail,
  getAdminNotifyEmails,
  isEmailConfigured,
} from './email.ts';
import { sendSms, isSmsConfigured } from './sms.ts';
import { sendWhatsApp, isWhatsAppConfigured } from './whatsapp.ts';

export interface ExpiryJobResult {
  markedExpired: number;
  emailsSent: number;
  smsSent: number;
  whatsappSent: number;
  adminEmailsSent: number;
  skipped: number;
}

interface NotifyTarget extends ExpiringSubscription {
  subscription_id: number;
  email: string;
  phone: string | null;
}

function expiryMessage(fullName: string, membershipName: string, daysRemaining: number): string {
  if (daysRemaining <= 0) {
    return `Hola ${fullName}, tu membresía "${membershipName}" en Caribean Gym vence hoy. Renueva para seguir entrenando.`;
  }
  if (daysRemaining === 1) {
    return `Hola ${fullName}, tu membresía "${membershipName}" en Caribean Gym vence mañana.`;
  }
  return `Hola ${fullName}, tu membresía "${membershipName}" en Caribean Gym vence en ${daysRemaining} días.`;
}

async function wasNotifiedToday(
  subscriptionId: number,
  channel: 'email' | 'sms' | 'whatsapp',
  alertType: 'expiring_soon' | 'expired'
): Promise<boolean> {
  const { rows } = await query<{ id: number }>(
    `SELECT id FROM expiry_notification_log
     WHERE subscription_id = $1 AND channel = $2 AND alert_type = $3
       AND notification_date = CURRENT_DATE
     LIMIT 1`,
    [subscriptionId, channel, alertType]
  );
  return Boolean(rows[0]);
}

async function wasExpiredNotified(
  subscriptionId: number,
  channel: 'email' | 'sms' | 'whatsapp'
): Promise<boolean> {
  const { rows } = await query<{ id: number }>(
    `SELECT id FROM expiry_notification_log
     WHERE subscription_id = $1 AND channel = $2 AND alert_type = 'expired'
     LIMIT 1`,
    [subscriptionId, channel]
  );
  return Boolean(rows[0]);
}

async function logNotification(
  userId: number | null,
  subscriptionId: number | null,
  channel: 'email' | 'sms' | 'whatsapp',
  alertType: 'expiring_soon' | 'expired' | 'admin_digest',
  daysRemaining: number | null
): Promise<void> {
  await query(
    `INSERT INTO expiry_notification_log (user_id, subscription_id, channel, alert_type, days_remaining)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, subscriptionId, channel, alertType, daysRemaining]
  );
}

async function getNotifyTargets(days: number): Promise<NotifyTarget[]> {
  const { rows } = await query<NotifyTarget>(
    `SELECT DISTINCT ON (u.id)
      u.id AS user_id,
      u.full_name,
      u.cedula,
      u.email,
      u.phone,
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
      u.email,
      u.phone,
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

async function adminDigestSentToday(): Promise<boolean> {
  const { rows } = await query<{ id: number }>(
    `SELECT id FROM expiry_notification_log
     WHERE alert_type = 'admin_digest' AND notification_date = CURRENT_DATE
     LIMIT 1`
  );
  return Boolean(rows[0]);
}

async function notifyMember(
  target: NotifyTarget,
  alertType: 'expiring_soon' | 'expired',
  settings: Awaited<ReturnType<typeof getExpirySettings>>,
  result: ExpiryJobResult
): Promise<void> {
  const message = alertType === 'expired'
    ? `Hola ${target.full_name}, tu membresía "${target.membership_name}" en Caribean Gym ha vencido. Renueva para recuperar el acceso.`
    : expiryMessage(target.full_name, target.membership_name, target.days_remaining);

  if (settings.email_notifications_enabled && settings.notify_members_email) {
    const already = alertType === 'expired'
      ? await wasExpiredNotified(target.subscription_id, 'email')
      : await wasNotifiedToday(target.subscription_id, 'email', 'expiring_soon');

    if (!already) {
      const sent = await sendEmail({
        to: target.email,
        subject: alertType === 'expired'
          ? 'Membresía vencida — Caribean Gym'
          : `Membresía por vencer — Caribean Gym`,
        text: message,
      });
      if (sent) {
        await logNotification(target.user_id, target.subscription_id, 'email', alertType, target.days_remaining);
        result.emailsSent += 1;
      } else if (!isEmailConfigured()) {
        result.skipped += 1;
      }
    }
  }

  if (settings.sms_notifications_enabled && settings.notify_members_sms && target.phone) {
    const already = alertType === 'expired'
      ? await wasExpiredNotified(target.subscription_id, 'sms')
      : await wasNotifiedToday(target.subscription_id, 'sms', 'expiring_soon');

    if (!already) {
      const sent = await sendSms(target.phone, message);
      if (sent) {
        await logNotification(target.user_id, target.subscription_id, 'sms', alertType, target.days_remaining);
        result.smsSent += 1;
      } else if (!isSmsConfigured()) {
        result.skipped += 1;
      }
    }
  }

  if (settings.whatsapp_notifications_enabled && settings.notify_members_whatsapp && target.phone) {
    const already = alertType === 'expired'
      ? await wasExpiredNotified(target.subscription_id, 'whatsapp')
      : await wasNotifiedToday(target.subscription_id, 'whatsapp', 'expiring_soon');

    if (!already) {
      const sent = await sendWhatsApp(target.phone, message);
      if (sent) {
        await logNotification(target.user_id, target.subscription_id, 'whatsapp', alertType, target.days_remaining);
        result.whatsappSent += 1;
      } else if (!isWhatsAppConfigured()) {
        result.skipped += 1;
      }
    }
  }
}

async function sendAdminDigest(
  expiring: ExpiringSubscription[],
  settings: Awaited<ReturnType<typeof getExpirySettings>>,
  result: ExpiryJobResult
): Promise<void> {
  if (!settings.notify_admin_email || !settings.email_notifications_enabled) return;
  if (expiring.length === 0) return;
  if (await adminDigestSentToday()) return;

  const recipients = getAdminNotifyEmails();
  if (recipients.length === 0) return;

  const lines = expiring.map(
    (m) => `• ${m.full_name} — ${m.membership_name} — ${m.days_remaining === 0 ? 'vence hoy' : `${m.days_remaining} días`}`
  );
  const body = `Resumen de membresías por vencer (próximos ${settings.expiry_alert_days} días):\n\n${lines.join('\n')}\n\n— Caribean Gym`;

  for (const to of recipients) {
    const sent = await sendEmail({
      to,
      subject: `[Caribean Gym] ${expiring.length} membresía(s) por vencer`,
      text: body,
    });
    if (sent) result.adminEmailsSent += 1;
  }

  if (result.adminEmailsSent > 0) {
    await logNotification(null, null, 'email', 'admin_digest', expiring.length);
  }
}

export async function runExpiryJob(): Promise<ExpiryJobResult> {
  const result: ExpiryJobResult = {
    markedExpired: 0,
    emailsSent: 0,
    smsSent: 0,
    whatsappSent: 0,
    adminEmailsSent: 0,
    skipped: 0,
  };

  const settings = await getExpirySettings();
  result.markedExpired = await markExpiredSubscriptions();

  const expiring = await getExpiringSubscriptions(settings.expiry_alert_days);
  const targets = await getNotifyTargets(settings.expiry_alert_days);
  const expiredTargets = await getRecentlyExpiredTargets();

  for (const target of targets) {
    await notifyMember(target, 'expiring_soon', settings, result);
  }

  for (const target of expiredTargets) {
    await notifyMember(target, 'expired', settings, result);
  }

  await sendAdminDigest(expiring, settings, result);

  if (result.emailsSent || result.smsSent || result.whatsappSent || result.markedExpired || result.adminEmailsSent) {
    console.log('[expiry-job]', result);
  }

  return result;
}
