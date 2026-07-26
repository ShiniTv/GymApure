import { asyncRouter } from './middleware/asyncRouter.ts';
import { z } from 'zod';
import { authorize, AuthRequest } from './middleware/auth.ts';
import {
  CHAT_MESSAGE_RETENTION_OPTIONS,
  getChatRetentionSettings,
  getExpirySettings,
  updateChatRetentionSettings,
  updateExpirySettings,
} from '../lib/gymSettings.ts';
import { getCheckInPinSettings, updateCheckInPinSettings } from '../lib/checkInPin.ts';
import {
  clearManualUsdOverride,
  getExchangeRateAdminView,
  setManualUsdOverride,
} from '../lib/exchangeRate.ts';
import {
  getPaymentDestinations,
  normalizePaymentDestinations,
  updatePaymentDestinations,
  type PaymentDestinations,
} from '../lib/paymentDestinations.ts';
import { runExchangeRateRefreshNow } from '../jobs/exchangeRateCron.ts';
import { invalidateAdminStatsCache } from '../lib/adminStatsCache.ts';
import { logAudit } from '../lib/audit.ts';
import { RECEPTION_STAFF } from '../lib/roles.ts';

const router = asyncRouter();

const expirySettingsSchema = z.object({
  expiry_alert_days: z.coerce.number().int().min(1).max(90).optional(),
});

const chatRetentionSettingsSchema = z.object({
  chat_message_retention_days: z.coerce
    .number()
    .int()
    .refine((v) => (CHAT_MESSAGE_RETENTION_OPTIONS as readonly number[]).includes(v), {
      message: 'Retención inválida (0, 30, 60, 90 o 180 días)',
    }),
});

const exchangeRateSettingsSchema = z.object({
  override_rate: z.coerce.number().positive().max(10_000).optional().nullable(),
  override_note: z.string().trim().max(200).optional().nullable(),
  clear_override: z.boolean().optional(),
});

const checkInPinSchema = z.object({
  check_in_pin: z.string().trim().max(12).optional(),
  require_self_check_in_pin: z.boolean().optional(),
});

const paymentDestinationsSchema = z.object({
  pago_movil: z
    .object({
      enabled: z.boolean().optional(),
      phone: z.string().max(20).optional(),
      bank_name: z.string().max(80).optional(),
      holder_cedula: z.string().max(20).optional(),
      notes: z.string().max(300).optional(),
    })
    .optional(),
  transferencia: z
    .object({
      enabled: z.boolean().optional(),
      bank_name: z.string().max(80).optional(),
      account_number: z.string().max(40).optional(),
      account_type: z.enum(['corriente', 'ahorro', '']).optional(),
      holder_name: z.string().max(120).optional(),
      holder_cedula: z.string().max(20).optional(),
      notes: z.string().max(300).optional(),
    })
    .optional(),
  zelle: z
    .object({
      enabled: z.boolean().optional(),
      email: z.string().max(120).optional(),
      holder_name: z.string().max(120).optional(),
      notes: z.string().max(300).optional(),
    })
    .optional(),
  efectivo_usd: z
    .object({
      enabled: z.boolean().optional(),
      denominations: z.array(z.coerce.number().positive()).max(12).optional(),
      notes: z.string().max(300).optional(),
    })
    .optional(),
});

/** Public to any authenticated role that can pay / register payments. */
router.get(
  '/payment-destinations',
  authorize(['admin', 'receptionist', 'member']),
  async (_req, res) => {
    try {
      const destinations = await getPaymentDestinations();
      res.json(destinations);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error interno';
      res.status(500).json({ error: message });
    }
  }
);

router.put('/payment-destinations', authorize(['admin']), async (req: AuthRequest, res) => {
  const parsed = paymentDestinationsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
  }

  try {
    const current = await getPaymentDestinations();
    const merged = normalizePaymentDestinations({
      ...current,
      ...parsed.data,
      pago_movil: { ...current.pago_movil, ...(parsed.data.pago_movil ?? {}) },
      transferencia: { ...current.transferencia, ...(parsed.data.transferencia ?? {}) },
      zelle: { ...current.zelle, ...(parsed.data.zelle ?? {}) },
      efectivo_usd: { ...current.efectivo_usd, ...(parsed.data.efectivo_usd ?? {}) },
    }) satisfies PaymentDestinations;
    const settings = await updatePaymentDestinations(merged);
    await logAudit(req.user!.id, 'settings.payment_destinations.update', {
      enabled: {
        pago_movil: settings.pago_movil.enabled,
        transferencia: settings.transferencia.enabled,
        zelle: settings.zelle.enabled,
        efectivo_usd: settings.efectivo_usd.enabled,
      },
    });
    res.json(settings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/expiry', authorize(['admin']), async (_req, res) => {
  try {
    const settings = await getExpirySettings();
    res.json(settings);
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
    const settings = await updateExpirySettings(parsed.data);
    invalidateAdminStatsCache();
    await logAudit(req.user!.id, 'settings.expiry.update', parsed.data);
    res.json(settings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/chat-retention', authorize(['admin']), async (_req, res) => {
  try {
    const settings = await getChatRetentionSettings();
    res.json(settings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.put('/chat-retention', authorize(['admin']), async (req: AuthRequest, res) => {
  const parsed = chatRetentionSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
  }

  try {
    const settings = await updateChatRetentionSettings(parsed.data);
    await logAudit(req.user!.id, 'settings.chat_retention.update', parsed.data);
    res.json(settings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/check-in-pin', authorize(RECEPTION_STAFF), async (_req, res) => {
  try {
    const settings = await getCheckInPinSettings();
    res.json({
      require_self_check_in_pin: settings.require_self_check_in_pin,
      check_in_pin: settings.check_in_pin,
      pin_configured: Boolean(settings.check_in_pin),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.put('/check-in-pin', authorize(['admin']), async (req: AuthRequest, res) => {
  const parsed = checkInPinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
  }

  try {
    const settings = await updateCheckInPinSettings(parsed.data);
    await logAudit(req.user!.id, 'settings.check_in_pin.update', {
      require_self_check_in_pin: settings.require_self_check_in_pin,
      pin_configured: Boolean(settings.check_in_pin),
    });
    res.json({
      require_self_check_in_pin: settings.require_self_check_in_pin,
      check_in_pin: settings.check_in_pin,
      pin_configured: Boolean(settings.check_in_pin),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

/** Members only need to know if a PIN is required (not the value). */
router.get('/check-in-pin/required', authorize(['member']), async (_req, res) => {
  try {
    const settings = await getCheckInPinSettings();
    res.json({
      require_self_check_in_pin: settings.require_self_check_in_pin,
      pin_configured: Boolean(settings.check_in_pin),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.get('/exchange-rate', authorize(['admin']), async (_req, res) => {
  try {
    const data = await getExchangeRateAdminView();
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

router.put('/exchange-rate', authorize(['admin']), async (req: AuthRequest, res) => {
  const parsed = exchangeRateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
  }

  try {
    if (parsed.data.clear_override) {
      await clearManualUsdOverride();
      await logAudit(req.user!.id, 'settings.exchange_rate.clear_override', {});
    } else if (parsed.data.override_rate != null) {
      const active = await setManualUsdOverride(
        parsed.data.override_rate,
        parsed.data.override_note ?? ''
      );
      await logAudit(req.user!.id, 'settings.exchange_rate.override', {
        rate: active.rate,
        note: parsed.data.override_note ?? '',
      });
    } else {
      return res.status(400).json({ error: 'override_rate o clear_override requerido' });
    }

    const data = await getExchangeRateAdminView();
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(400).json({ error: message });
  }
});

router.post('/exchange-rate/refresh', authorize(['admin']), async (req: AuthRequest, res) => {
  try {
    const result = await runExchangeRateRefreshNow();
    await logAudit(req.user!.id, 'settings.exchange_rate.refresh', {
      inserted: result.inserted,
      effective_date: result.rate?.effective_date,
      rate: result.rate?.rate,
    });
    const data = await getExchangeRateAdminView();
    res.json({ success: true, result, ...data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(502).json({ error: message });
  }
});

export default router;
