import { toWhatsAppDigits } from './phoneFormat.ts';

export type MetaWhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
};

export type WhatsAppTemplateName =
  | 'expiring'
  | 'expired'
  | 'generic';

const DEFAULT_TEMPLATES: Record<WhatsAppTemplateName, string> = {
  expiring: 'membership_expiring',
  expired: 'membership_expired',
  generic: 'caribean_gym_alert',
};

export function getWhatsAppTemplateName(kind: WhatsAppTemplateName): string | null {
  const envKey = `WHATSAPP_TEMPLATE_${kind.toUpperCase()}` as
    | 'WHATSAPP_TEMPLATE_EXPIRING'
    | 'WHATSAPP_TEMPLATE_EXPIRED'
    | 'WHATSAPP_TEMPLATE_GENERIC';
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv === 'none' || fromEnv === 'false') return null;
  return fromEnv || DEFAULT_TEMPLATES[kind];
}

export function shouldUseWhatsAppTemplates(): boolean {
  return process.env.WHATSAPP_USE_TEMPLATES?.trim().toLowerCase() !== 'false';
}

export function getMetaWhatsAppConfig(): MetaWhatsAppConfig | null {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!accessToken || !phoneNumberId) return null;

  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || 'v21.0';
  return { accessToken, phoneNumberId, apiVersion };
}

export function isMetaWhatsAppConfigured(): boolean {
  return getMetaWhatsAppConfig() !== null;
}

async function postMetaMessage(
  config: MetaWhatsAppConfig,
  digits: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: digits,
        ...payload,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[whatsapp:meta] Graph API error:', res.status, errText);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[whatsapp:meta] Error enviando a', digits, err);
    return false;
  }
}

export async function sendMetaWhatsAppTemplate(
  to: string,
  templateName: string,
  bodyParams: string[],
  languageCode = 'es'
): Promise<boolean> {
  const config = getMetaWhatsAppConfig();
  if (!config) return false;

  const digits = toWhatsAppDigits(to);
  if (!digits) {
    console.warn('[whatsapp:meta] Teléfono inválido:', to);
    return false;
  }

  return postMetaMessage(config, digits, {
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: bodyParams.length
        ? [
            {
              type: 'body',
              parameters: bodyParams.map((text) => ({ type: 'text', text })),
            },
          ]
        : undefined,
    },
  });
}

export async function sendMetaWhatsApp(to: string, body: string): Promise<boolean> {
  const config = getMetaWhatsAppConfig();
  if (!config) return false;

  const digits = toWhatsAppDigits(to);
  if (!digits) {
    console.warn('[whatsapp:meta] Teléfono inválido:', to);
    return false;
  }

  return postMetaMessage(config, digits, {
    type: 'text',
    text: {
      preview_url: false,
      body,
    },
  });
}
