import { type NextFunction, type Response } from 'express';
import { asyncRouter } from './middleware/asyncRouter.ts';
import { z } from 'zod';
import { authorize, AuthRequest } from './middleware/auth.ts';
import {
  getExpirySettings,
  updateExpirySettings,
  type ExpirySettings,
} from '../lib/gymSettings.ts';
import { invalidateAdminStatsCache } from '../lib/adminStatsCache.ts';
import { sendEmail, isEmailConfigured } from '../lib/notifications/email.ts';
import { sendSms, isSmsConfigured } from '../lib/notifications/sms.ts';
import { sendWhatsApp, isWhatsAppConfigured, getWhatsAppProvider, getWhatsAppProviderLabel } from '../lib/notifications/whatsapp.ts';
import { runExpiryJob } from '../lib/notifications/expiryNotifier.ts';
import { runDbMaintenanceIfDue } from '../lib/dbMaintenance.ts';
import { logAudit } from '../lib/audit.ts';

const router = asyncRouter();

const expirySettingsSchema = z.object({
  expiry_alert_days: z.coerce.number().int().min(1).max(90).optional(),
  email_notifications_enabled: z.boolean().optional(),
  sms_notifications_enabled: z.boolean().optional(),
  whatsapp_notifications_enabled: z.boolean().optional(),
  notify_members_email: z.boolean().optional(),
  notify_members_sms: z.boolean().optional(),
  notify_members_whatsapp: z.boolean().optional(),
  notify_admin_email: z.boolean().optional(),
  notify_payment_events: z.boolean().optional(),
  notify_admin_new_payment: z.boolean().optional(),
  notify_routine_assigned: z.boolean().optional(),
});

const testSchema = z
  .object({
    channel: z.enum(['email', 'whatsapp', 'sms']),
    target: z.string().trim().min(3),
  })
  .superRefine((data, ctx) => {
    if (data.channel === 'email' && !z.string().email().safeParse(data.target).success) {
      ctx.addIssue({ code: 'custom', message: 'Email inválido', path: ['target'] });
    }
  });

function providerStatus() {
  return {
    email: isEmailConfigured(),
    sms: isSmsConfigured(),
    whatsapp: isWhatsAppConfigured(),
    whatsappProvider: getWhatsAppProvider(),
    whatsappProviderLabel: getWhatsAppProviderLabel(),
  };
}

function authorizeCronOrAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const headerSecret =
    (typeof req.headers['x-cron-secret'] === 'string' ? req.headers['x-cron-secret'] : null) ??
    (typeof req.headers.authorization === 'string'
      ? req.headers.authorization.replace(/^Bearer\s+/i, '')
      : null);

  if (cronSecret && headerSecret === cronSecret) {
    return next();
  }

  return authorize(['admin'])(req, res, next);
}

router.get('/expiry', authorize(['admin']), async (_req, res) => {
  try {
    const settings = await getExpirySettings();
    res.json({
      ...settings,
      providers: providerStatus(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.put('/expiry', authorize(['admin']), async (req: AuthRequest, res) => {
  const parsed = expirySettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
  }

  try {
    const settings = await updateExpirySettings(parsed.data as Partial<ExpirySettings>);
    invalidateAdminStatsCache();
    await logAudit(req.user!.id, 'settings.expiry.update', parsed.data);
    res.json({
      ...settings,
      providers: providerStatus(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.post('/expiry/run', authorizeCronOrAdmin, async (req: AuthRequest, res) => {
  try {
    const maintenance = await runDbMaintenanceIfDue();
    const result = await runExpiryJob();
    invalidateAdminStatsCache();
    if (req.user) {
      await logAudit(req.user.id, 'settings.expiry.run', { ...result, maintenance });
    }
    res.json({ success: true, result, maintenance });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.post('/notifications/test', authorize(['admin']), async (req: AuthRequest, res) => {
  const parsed = testSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
  }

  const { channel, target } = parsed.data;
  const message = 'Mensaje de prueba desde Caribean Gym. Si lo recibes, las notificaciones están configuradas correctamente.';
  const isProduction = process.env.NODE_ENV === 'production';

  try {
    let sent = false;
    if (channel === 'email') {
      sent = await sendEmail({
        to: target,
        subject: 'Prueba — Caribean Gym',
        text: message,
      });
    } else if (channel === 'whatsapp') {
      sent = await sendWhatsApp(target, message);
    } else {
      sent = await sendSms(target, message);
    }

    const configured =
      channel === 'email'
        ? isEmailConfigured()
        : channel === 'whatsapp'
          ? isWhatsAppConfigured()
          : isSmsConfigured();

    const simulated = !isProduction && !sent && !configured;
    const mock = simulated;

    res.json({
      success: sent,
      channel,
      configured,
      whatsappProvider: channel === 'whatsapp' ? getWhatsAppProvider() : undefined,
      whatsappProviderLabel: channel === 'whatsapp' ? getWhatsAppProviderLabel() : undefined,
      simulated,
      mock,
      message: sent
        ? 'Mensaje enviado correctamente. Revisa tu bandeja de entrada.'
        : simulated
          ? channel === 'email'
            ? 'Prueba simulada (sin SMTP). El mensaje se registró en la consola del servidor. Añade SMTP_HOST, SMTP_USER y SMTP_PASS en .env y reinicia para envío real.'
            : channel === 'whatsapp'
              ? 'Prueba simulada (sin WhatsApp). Revisa la consola del servidor o configura WHATSAPP_ACCESS_TOKEN / Twilio en .env.'
              : 'Prueba simulada (sin SMS). Revisa la consola del servidor o configura Twilio en .env.'
          : !configured
            ? 'Proveedor no configurado. Define credenciales reales en .env para habilitar envíos.'
            : 'No se pudo enviar. Revisa credenciales en .env (usuario, contraseña o token incorrectos).',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: msg });
  }
});

export default router;
