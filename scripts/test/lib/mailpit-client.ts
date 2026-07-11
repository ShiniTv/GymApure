/**
 * Cliente HTTP para Mailpit (verificación de correos en tests locales/CI).
 * API: https://mailpit.axllent.org/docs/api/
 */
const DEFAULT_API = process.env.MAILPIT_API_URL ?? 'http://localhost:8025';

export interface MailpitMessage {
  ID: string;
  Subject: string;
  To: { Address: string; Name?: string }[];
  HTML?: string;
  Text?: string;
}

export interface MailpitListResponse {
  messages: MailpitMessage[];
  total: number;
}

export function isMailpitConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.MAILPIT_API_URL?.trim());
}

export async function clearMailpitMessages(apiBase = DEFAULT_API): Promise<void> {
  const res = await fetch(`${apiBase}/api/v1/messages`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Mailpit clear failed: ${res.status}`);
  }
}

export async function listMailpitMessages(apiBase = DEFAULT_API): Promise<MailpitMessage[]> {
  const res = await fetch(`${apiBase}/api/v1/messages`);
  if (!res.ok) {
    throw new Error(`Mailpit list failed: ${res.status}`);
  }
  const data = (await res.json()) as MailpitListResponse;
  return data.messages ?? [];
}

export async function waitForEmailTo(
  recipient: string,
  options?: { subjectIncludes?: string; timeoutMs?: number; apiBase?: string }
): Promise<MailpitMessage | null> {
  const apiBase = options?.apiBase ?? DEFAULT_API;
  const timeoutMs = options?.timeoutMs ?? 15_000;
  const normalized = recipient.toLowerCase();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const messages = await listMailpitMessages(apiBase);
    const match = messages.find((msg) => {
      const toMatch = msg.To?.some((t) => t.Address.toLowerCase() === normalized);
      if (!toMatch) return false;
      if (options?.subjectIncludes) {
        return msg.Subject.toLowerCase().includes(options.subjectIncludes.toLowerCase());
      }
      return true;
    });
    if (match) return match;
    await new Promise((r) => setTimeout(r, 500));
  }

  return null;
}
