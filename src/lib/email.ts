import dns from 'node:dns';
import { logger } from './logger.ts';

interface EmailSender {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
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

function isConfigured(): boolean {
  return isEmailConfigured();
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  if (!isConfigured()) {
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

// ─── Templates ────────────────────────────────────────────

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<style>
  body { margin:0; padding:0; background:#f5f5f5; font-family:Inter,system-ui,sans-serif; }
  .container { max-width:560px; margin:24px auto; background:#fff; border-radius:12px; overflow:hidden; }
  .header { background:#1e1e2e; padding:24px 32px; text-align:center; }
  .header h1 { color:#fff; margin:0; font-size:18px; font-weight:700; letter-spacing:-0.02em; }
  .body { padding:32px; color:#1e1e2e; font-size:14px; line-height:1.6; }
  .footer { padding:16px 32px; background:#f5f5f5; text-align:center; font-size:11px; color:#888; }
  .btn { display:inline-block; padding:10px 24px; border-radius:8px; font-size:14px; font-weight:600;
         text-decoration:none; color:#fff; background:#1e1e2e; }
  .badge { display:inline-block; padding:2px 10px; border-radius:99px; font-size:12px; font-weight:600; }
  .badge-green { background:#dcfce7; color:#166534; }
  .badge-red { background:#fee2e2; color:#991b1b; }
  hr { border:none; border-top:1px solid #e5e5e5; margin:20px 0; }
</style></head>
<body>
  <div class="container">
    <div class="header"><h1>GymApure</h1></div>
    <div class="body">${content}</div>
    <div class="footer">GymApure &mdash; Entrena fuerte, vive sano.</div>
  </div>
</body></html>`;
}

export function passwordResetEmail(name: string, resetUrl: string): string {
  return layout(`<h2 style="margin-top:0">Recuperar contraseña</h2>
    <p>Hola <strong>${name}</strong>,</p>
    <p>Recibimos una solicitud para restablecer tu contraseña en GymApure.</p>
    <p style="text-align:center;margin:24px 0"><a class="btn" href="${resetUrl}">Restablecer contraseña</a></p>
    <p style="font-size:12px;color:#666">Si no solicitaste este cambio, ignora este correo. El enlace expira en 1 hora.</p>`);
}

export function welcomeEmail(name: string): string {
  return layout(`<h2 style="margin-top:0">Bienvenido, ${name}</h2>
    <p>Tu cuenta ha sido creada exitosamente. Ya puedes acceder a la plataforma con tu correo y contraseña.</p>
    <p>Para ingresar al gym, preséntate en recepción con tu cédula de identidad. Un administrador activará tu membresía.</p>
    <p style="margin-bottom:0">Si tienes dudas, consulta con el personal del gym.</p>`);
}

export function paymentApprovedEmail(
  name: string,
  amount: number,
  membershipName?: string | null
): string {
  return layout(`<h2 style="margin-top:0">Pago aprobado</h2>
    <p>Hola <strong>${name}</strong>,</p>
    <p>Tu pago de <strong>$${amount.toFixed(2)} USD</strong> ha sido aprobado.
    ${membershipName ? `Membresía: <strong>${membershipName}</strong>.` : ''}</p>
    <p>Ya puedes acceder al gym. ¡Disfruta tu entrenamiento!</p>`);
}

export function paymentRejectedEmail(name: string, amount: number): string {
  return layout(`<h2 style="margin-top:0">Pago rechazado</h2>
    <p>Hola <strong>${name}</strong>,</p>
    <p>Tu pago de <strong>$${amount.toFixed(2)} USD</strong> no pudo ser aprobado.</p>
    <p>Comunícate con recepción para resolverlo y volver a reportar tu pago.</p>`);
}

export function membershipExpiringEmail(name: string, days: number): string {
  return layout(`<h2 style="margin-top:0">Membresía por vencer</h2>
    <p>Hola <strong>${name}</strong>,</p>
    <p>Tu membresía vence en <strong>${days} día${days !== 1 ? 's' : ''}</strong>.</p>
    <p>Renueva a tiempo para seguir entrenando sin interrupciones. Puedes hacerlo desde la sección de pagos en la plataforma o directamente en recepción.</p>`);
}

export function membershipExpiredEmail(name: string): string {
  return layout(`<h2 style="margin-top:0">Membresía vencida</h2>
    <p>Hola <strong>${name}</strong>,</p>
    <p>Tu membresía ha vencido. Para seguir entrenando, renueva tu plan en recepción o desde la plataforma.</p>
    <p>¡Te esperamos de vuelta!</p>`);
}
