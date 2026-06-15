import { isMetaWhatsAppConfigured, sendMetaWhatsApp } from './whatsappMeta.ts';
import { isTwilioWhatsAppConfigured, sendTwilioWhatsApp } from './whatsappTwilio.ts';

export type WhatsAppProvider = 'meta' | 'twilio';

function resolveProviderPreference(): WhatsAppProvider | 'auto' {
  const raw = process.env.WHATSAPP_PROVIDER?.trim().toLowerCase();
  if (raw === 'meta') return 'meta';
  if (raw === 'twilio') return 'twilio';
  return 'auto';
}

/** Active backend: meta Cloud API, Twilio, or null if none configured. */
export function getWhatsAppProvider(): WhatsAppProvider | null {
  const pref = resolveProviderPreference();

  if (pref === 'meta') {
    return isMetaWhatsAppConfigured() ? 'meta' : null;
  }
  if (pref === 'twilio') {
    return isTwilioWhatsAppConfigured() ? 'twilio' : null;
  }

  if (isMetaWhatsAppConfigured()) return 'meta';
  if (isTwilioWhatsAppConfigured()) return 'twilio';
  return null;
}

export function isWhatsAppConfigured(): boolean {
  return getWhatsAppProvider() !== null;
}

export function getWhatsAppProviderLabel(): string | null {
  const provider = getWhatsAppProvider();
  if (provider === 'meta') return 'Meta Cloud API';
  if (provider === 'twilio') return 'Twilio';
  return null;
}

export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const provider = getWhatsAppProvider();

  if (!provider) {
    console.log(`[whatsapp:mock] To: ${to} | ${body}`);
    return false;
  }

  if (provider === 'meta') {
    return sendMetaWhatsApp(to, body);
  }
  return sendTwilioWhatsApp(to, body);
}
