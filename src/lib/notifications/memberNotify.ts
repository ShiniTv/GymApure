import { query } from '../../db/index.ts';
import { getExpirySettings } from '../gymSettings.ts';
import { sendEmail, getAdminNotifyEmails } from './email.ts';
import { sendSms } from './sms.ts';
import { sendWhatsApp, sendWhatsAppMessage } from './whatsapp.ts';

export interface MemberContact {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
}

export interface NotifyResult {
  email: boolean;
  whatsapp: boolean;
  sms: boolean;
}

export async function fetchMemberContact(userId: number): Promise<MemberContact | null> {
  const { rows } = await query<MemberContact>(
    'SELECT id, full_name, email, phone FROM users WHERE id = $1',
    [userId]
  );
  return rows[0] ?? null;
}

export async function notifyMember(
  member: MemberContact,
  subject: string,
  message: string
): Promise<NotifyResult> {
  const settings = await getExpirySettings();
  const result: NotifyResult = { email: false, whatsapp: false, sms: false };

  if (settings.email_notifications_enabled && settings.notify_members_email && member.email) {
    result.email = await sendEmail({
      to: member.email,
      subject,
      text: message,
    });
  }

  if (member.phone) {
    if (settings.whatsapp_notifications_enabled && settings.notify_members_whatsapp) {
      result.whatsapp = await sendWhatsAppMessage(member.phone, {
        kind: 'generic',
        bodyParams: [member.full_name, message],
        fallbackText: message,
      });
    }
    if (!result.whatsapp && settings.sms_notifications_enabled && settings.notify_members_sms) {
      result.sms = await sendSms(member.phone, message);
    }
  }

  return result;
}

export async function notifyAdmins(subject: string, message: string): Promise<number> {
  const settings = await getExpirySettings();
  if (!settings.email_notifications_enabled || !settings.notify_admin_email) return 0;

  const recipients = getAdminNotifyEmails();
  let sent = 0;
  for (const to of recipients) {
    const ok = await sendEmail({ to, subject, text: message });
    if (ok) sent += 1;
  }
  return sent;
}
