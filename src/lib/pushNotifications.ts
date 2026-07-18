import { query } from '../db/index.ts';
import { logger } from './logger.ts';

let vapidKeys: { publicKey: string; privateKey: string; subject: string } | null = null;

export function configurePush(keys: { publicKey: string; privateKey: string; subject: string }) {
  vapidKeys = keys;
}

export function getVapidPublicKey(): string | null {
  return vapidKeys?.publicKey ?? null;
}

function isConfigured(): boolean {
  return vapidKeys !== null && !!vapidKeys.publicKey && !!vapidKeys.privateKey;
}

export async function subscribeUser(userId: number, subscription: unknown): Promise<void> {
  await query(
    `INSERT INTO push_subscriptions (user_id, subscription)
     VALUES ($1, $2)
     ON CONFLICT (user_id, subscription::text)
     DO UPDATE SET subscription = $2, updated_at = NOW()`,
    [userId, JSON.stringify(subscription)]
  );
}

export async function unsubscribeUser(userId: number, endpoint: string): Promise<void> {
  await query(
    `DELETE FROM push_subscriptions WHERE user_id = $1 AND subscription->>'endpoint' = $2`,
    [userId, endpoint]
  );
}

export async function sendPushToUser(userId: number, title: string, body: string, url?: string) {
  if (!isConfigured()) return;

  try {
    const { rows } = await query<{ subscription: string }>(
      'SELECT subscription FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );

    if (rows.length === 0) return;

    const webPush = await import('web-push');
    webPush.setVapidDetails(vapidKeys!.subject, vapidKeys!.publicKey, vapidKeys!.privateKey);

    const payload = JSON.stringify({ title, body, url: url ?? '/' });

    for (const row of rows) {
      try {
        const sub = JSON.parse(row.subscription) as import('web-push').PushSubscription;
        await webPush.sendNotification(sub, payload);
      } catch (err: unknown) {
        const statusCode =
          err && typeof err === 'object' && 'statusCode' in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;
        if (statusCode === 410 || statusCode === 404) {
          const expiredSub = JSON.parse(row.subscription) as { endpoint?: string };
          await query(`DELETE FROM push_subscriptions WHERE subscription->>'endpoint' = $1`, [
            expiredSub.endpoint,
          ]);
        }
      }
    }
  } catch (err) {
    logger.error('Error sending push notification', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function sendPushToStaff(title: string, body: string, url?: string) {
  if (!isConfigured()) return;

  try {
    const { rows } = await query<{ user_id: number }>(
      'SELECT DISTINCT user_id FROM push_subscriptions'
    );

    const { rows: staffUsers } = await query<{ id: number }>(
      `SELECT id FROM users WHERE role IN ('admin', 'receptionist') AND id = ANY($1)`,
      [rows.map((r) => r.user_id)]
    );

    await Promise.allSettled(staffUsers.map((user) => sendPushToUser(user.id, title, body, url)));
  } catch (err) {
    logger.error('Error sending push to staff', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
