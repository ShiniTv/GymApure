import nodemailer from 'nodemailer';
import { logger } from '../logger.ts';

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;

  const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return {
    host,
    port,
    secure,
    auth: { user, pass },
  };
}

export function isEmailConfigured(): boolean {
  return smtpConfig() !== null;
}

export function getDefaultFrom(): string {
  return process.env.SMTP_FROM?.trim() || 'Caribean Gym <noreply@caribeangym.local>';
}

export function getAdminNotifyEmails(): string[] {
  const raw = process.env.ADMIN_NOTIFY_EMAILS?.trim();
  if (!raw) return [];
  return raw.split(',').map((e) => e.trim()).filter(Boolean);
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const config = smtpConfig();
  if (!config) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport(config);
  }
  return transporter;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('SMTP no configurado. Envío cancelado.');
    } else {
      logger.info('Email simulado (sin SMTP)', {
        to: payload.to,
        subject: payload.subject,
      });
    }
    return false;
  }

  try {
    await transport.sendMail({
      from: getDefaultFrom(),
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
    return true;
  } catch (err) {
    logger.error('Error enviando email', {
      to: payload.to,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
