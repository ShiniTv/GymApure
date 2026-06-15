import { toTwilioWhatsAppAddress } from './phoneFormat.ts';

function twilioCredentials() {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();
  if (!sid || !token || !from) return null;
  return { sid, token, from: from.startsWith('whatsapp:') ? from : `whatsapp:${from}` };
}

export function isTwilioWhatsAppConfigured(): boolean {
  return twilioCredentials() !== null;
}

export async function sendTwilioWhatsApp(to: string, body: string): Promise<boolean> {
  const creds = twilioCredentials();
  if (!creds) return false;

  const normalized = toTwilioWhatsAppAddress(to);
  if (!normalized) {
    console.warn('[whatsapp:twilio] Teléfono inválido:', to);
    return false;
  }

  try {
    const auth = Buffer.from(`${creds.sid}:${creds.token}`).toString('base64');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${creds.sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: normalized,
          From: creds.from,
          Body: body,
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('[whatsapp:twilio] Twilio error:', res.status, errText);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[whatsapp:twilio] Error enviando a', to, err);
    return false;
  }
}
