export function isSmsConfigured(): boolean {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  return Boolean(sid && token && from);
}

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (phone.trim().startsWith('+')) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith('58')) return `+${digits}`;
  if (digits.length === 10) return `+58${digits}`;
  return `+${digits}`;
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();

  if (!sid || !token || !from) {
    console.log(`[sms:mock] To: ${to} | ${body}`);
    return false;
  }

  const normalized = normalizePhone(to);
  if (!normalized) {
    console.warn('[sms] Teléfono inválido:', to);
    return false;
  }

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: normalized,
          From: from,
          Body: body,
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('[sms] Twilio error:', res.status, errText);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[sms] Error enviando a', to, err);
    return false;
  }
}
