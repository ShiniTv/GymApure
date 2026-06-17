import {
  isMetaWhatsAppConfigured,
  sendMetaWhatsApp,
  sendMetaWhatsAppTemplate,
  getWhatsAppTemplateName,
  shouldUseWhatsAppTemplates,
  type WhatsAppTemplateName,
} from './whatsappMeta.ts';
import { isTwilioWhatsAppConfigured, sendTwilioWhatsApp } from './whatsappTwilio.ts';
import { logger } from '../logger.ts';

export type WhatsAppProvider = 'meta' | 'twilio';

export interface WhatsAppTemplateMessage {
  kind: WhatsAppTemplateName;
  bodyParams: string[];
  fallbackText: string;
}

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
    if (process.env.NODE_ENV === 'production') {
      logger.error('Proveedor WhatsApp no configurado. Envio cancelado.');
    } else {
      logger.info('WhatsApp simulado (sin proveedor)', { to });
    }
    return false;
  }

  if (provider === 'meta') {
    return sendMetaWhatsApp(to, body);
  }
  return sendTwilioWhatsApp(to, body);
}

export async function sendWhatsAppMessage(
  to: string,
  message: WhatsAppTemplateMessage
): Promise<boolean> {
  const provider = getWhatsAppProvider();

  if (!provider) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('Proveedor WhatsApp no configurado. Envio cancelado.');
    } else {
      logger.info('WhatsApp plantilla simulado (sin proveedor)', { to, kind: message.kind });
    }
    return false;
  }

  if (provider === 'meta' && shouldUseWhatsAppTemplates()) {
    const templateName = getWhatsAppTemplateName(message.kind);
    if (templateName) {
      const sent = await sendMetaWhatsAppTemplate(to, templateName, message.bodyParams);
      if (sent) return true;
    }
    return sendMetaWhatsApp(to, message.fallbackText);
  }

  return sendWhatsApp(to, message.fallbackText);
}
