/** E.164 digits only (no +), e.g. 584121234567 — used by Meta Cloud API. */
export function toWhatsAppDigits(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;

  if (phone.trim().startsWith('+')) {
    return digits;
  }
  if (digits.length === 11 && digits.startsWith('58')) {
    return digits;
  }
  if (digits.length === 10) {
    return `58${digits}`;
  }
  return digits;
}

/** Twilio WhatsApp address: whatsapp:+584121234567 */
export function toTwilioWhatsAppAddress(phone: string): string | null {
  const digits = toWhatsAppDigits(phone);
  if (!digits) return null;
  return `whatsapp:+${digits}`;
}
