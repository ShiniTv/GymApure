import { env } from '../../config/env.ts';
import { sendEmail, type EmailOptions } from './send.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Parse CSV list from ADMIN_NOTIFY_EMAILS. */
export function parseAdminNotifyEmails(raw?: string | null): string[] {
  const source = raw ?? env.ADMIN_NOTIFY_EMAILS ?? '';
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of source.split(/[,;\s]+/)) {
    const email = part.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

export function getAdminNotifyEmails(): string[] {
  return parseAdminNotifyEmails();
}

/** Send the same message to every address in ADMIN_NOTIFY_EMAILS. */
export async function notifyAdmins(
  content: Pick<EmailOptions, 'subject' | 'html' | 'text'>
): Promise<number> {
  const recipients = getAdminNotifyEmails();
  if (recipients.length === 0) {
    return 0;
  }

  let sent = 0;
  for (const to of recipients) {
    const ok = await sendEmail({ to, ...content });
    if (ok) sent += 1;
  }
  return sent;
}
