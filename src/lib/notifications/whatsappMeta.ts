import { toWhatsAppDigits } from './phoneFormat.ts';

export type MetaWhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
};

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

export async function sendMetaWhatsApp(to: string, body: string): Promise<boolean> {
  const config = getMetaWhatsAppConfig();
  if (!config) return false;

  const digits = toWhatsAppDigits(to);
  if (!digits) {
    console.warn('[whatsapp:meta] Teléfono inválido:', to);
    return false;
  }

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
        type: 'text',
        text: {
          preview_url: false,
          body,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[whatsapp:meta] Graph API error:', res.status, errText);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[whatsapp:meta] Error enviando a', to, err);
    return false;
  }
}
