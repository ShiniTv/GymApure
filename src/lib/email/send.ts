import dns from 'node:dns';
import { logger } from '../logger.ts';

interface EmailSender {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let sender: EmailSender | null = null;

export function configureEmail(opts: EmailSender) {
  sender = {
    ...opts,
    pass: opts.pass.replace(/\s/g, ''),
  };
}

export function isEmailConfigured(): boolean {
  return sender !== null && !!sender.host && !!sender.user && !!sender.pass;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  if (!isEmailConfigured()) {
    logger.warn('Email no configurado — omitiendo envío', { to, subject });
    return false;
  }

  try {
    const nodemailer = await import('nodemailer');
    const smtpHost = sender!.host;
    let connectHost = smtpHost;
    try {
      const ipv4 = await dns.promises.resolve4(smtpHost);
      if (ipv4[0]) connectHost = ipv4[0];
    } catch {
      // Usar hostname si resolve4 falla
    }

    const port = sender!.port;
    // 465 = SSL implícito; 587 = STARTTLS (secure debe ser false)
    const secure = port === 465 ? true : port === 587 ? false : sender!.secure;

    const transporter = nodemailer.createTransport({
      host: connectHost,
      port,
      secure,
      requireTLS: port === 587,
      auth: { user: sender!.user, pass: sender!.pass },
      tls: {
        servername: smtpHost,
        minVersion: 'TLSv1.2',
      },
    });

    await transporter.sendMail({
      from: sender!.from,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    });

    logger.info('Email enviado', { to, subject });
    return true;
  } catch (err) {
    logger.error('Error enviando email', {
      to,
      subject,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
